import pandas as pd
from sklearn.neural_network import MLPClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report, accuracy_score, silhouette_score, davies_bouldin_score, calinski_harabasz_score
from sklearn.cluster import MiniBatchKMeans
from sklearn.mixture import GaussianMixture
import matplotlib.pyplot as plt
import numpy as np
import warnings
import mlflow
warnings.filterwarnings('ignore')

print("Loading dataset...")
df = pd.read_parquet("/Users/devik/Downloads/archive (2)/kronodroid-2021-real-v1.parquet")

print("Filtering dataset for Family Pair (Airpush/StopSMS vs Agent)...")

# Focus only on the specific pairs evaluated in the Thesis for dynamic drift
target_families = ['Airpush/StopSMS', 'Agent']
df = df[df['MalFamily'].isin(target_families)]

# Process temporal metadata to replicate chronology (from 2008 to 2020 per the thesis)
df['EarliestModDate'] = pd.to_datetime(df['EarliestModDate'], format='mixed', errors='coerce')
df = df.dropna(subset=['EarliestModDate'])
df = df[(df['EarliestModDate'].dt.year >= 2008) & (df['EarliestModDate'].dt.year <= 2020)]

# Sort purely chronologically to evaluate concept drift
df = df.sort_values(by='EarliestModDate').reset_index(drop=True)

# Encode target family as binary (0 = Airpush, 1 = Agent)
y = (df['MalFamily'] == 'Agent').astype(int)

# Identify metadata target leaks to drop
metadata_cols = ['Package', 'Malware', 'MalFamily', 'Detection_Ratio', 'Scanners', 'sha256', 'EarliestModDate', 'HighestModDate']
X = df.drop(columns=[col for col in metadata_cols if col in df.columns])

print("Encoding categories...")
# Optimize memory and speed: cast string columns to numeric first where possible.
# This prevents pd.get_dummies from exploding on binary "0"/"1" string features.
for col in X.select_dtypes(include=['object', 'string']).columns:
    try:
        X[col] = X[col].astype(float)
    except (ValueError, TypeError):
        pass
X = pd.get_dummies(X)
X = X.fillna(0)

# -------------------------------------------------------------
# -------------------------------------------------------------
# HYPERPARAMETER TUNING & 3-MODEL COMPARISON PIPELINE
# Compares Static, Fixed Threshold, and Multiple Adaptive Thresholds
# -------------------------------------------------------------
import copy

BATCH_SIZE = 50
WINDOW_SIZE = 10     # Sliding window for Adaptive Threshold
Z_SCORES_TO_TEST = [0.5, 1.0, 1.5, 2.0]
FIXED_THRESHOLD = 0.05

print(f"Initializing Hyperparameter Tuning & Comparison (Batch Size: {BATCH_SIZE})...")

# Setup MLflow
mlflow.set_experiment("Drift_Aware_Malware_Detection")
mlflow.start_run(run_name="Hyperparameter_Sweep")
mlflow.log_param("BATCH_SIZE", BATCH_SIZE)
mlflow.log_param("WINDOW_SIZE", WINDOW_SIZE)
mlflow.log_param("FIXED_THRESHOLD", FIXED_THRESHOLD)
mlflow.log_param("Z_SCORES", str(Z_SCORES_TO_TEST))

# 1. INITIALIZE MODELS & SCALERS
scaler_static = StandardScaler()
scaler_fixed = StandardScaler()
scalers_adaptive = {z: StandardScaler() for z in Z_SCORES_TO_TEST}

clf_static = MLPClassifier(hidden_layer_sizes=(50,), random_state=42)
clf_fixed = MLPClassifier(hidden_layer_sizes=(50,), random_state=42)
clfs_adaptive = {z: MLPClassifier(hidden_layer_sizes=(50,), random_state=42) for z in Z_SCORES_TO_TEST}

classes = np.unique(y)

# 2. INITIAL TRAINING (Batch 0)
X_init = X.iloc[:BATCH_SIZE]
y_init = y.iloc[:BATCH_SIZE]

X_init_scaled = scaler_static.fit_transform(X_init)
clf_static.partial_fit(X_init_scaled, y_init, classes=classes)

# Copy the trained states to the other models
clf_fixed = copy.deepcopy(clf_static)
scaler_fixed = copy.deepcopy(scaler_static)

for z in Z_SCORES_TO_TEST:
    clfs_adaptive[z] = copy.deepcopy(clf_static)
    scalers_adaptive[z] = copy.deepcopy(scaler_static)

# Initial Clustering
kmeans = MiniBatchKMeans(n_clusters=2, random_state=42, batch_size=BATCH_SIZE)
kmeans.partial_fit(X_init_scaled)

# Tracking variables
drifts_fixed = 0
drifts_adaptive = {z: 0 for z in Z_SCORES_TO_TEST}

prev_kmeans_sil = 0.0
prev_gmm_sil = 0.0
delta_history = []
metrics_log = []

print("Starting 3-Way Streaming Race...")

# 3. STREAMING EVALUATION & RETRAINING
for i in range(BATCH_SIZE, len(X), BATCH_SIZE):
    X_batch = X.iloc[i:i+BATCH_SIZE]
    y_batch = y.iloc[i:i+BATCH_SIZE]
    
    if len(X_batch) < 2:
        break
        
    # Scale current batch for each model independently
    X_b_static = scaler_static.transform(X_batch)
    X_b_fixed = scaler_fixed.transform(X_batch)
    X_b_adaptive = {z: scalers_adaptive[z].transform(X_batch) for z in Z_SCORES_TO_TEST}
    
    # A. PREDICT
    acc_static = accuracy_score(y_batch, clf_static.predict(X_b_static))
    acc_fixed = accuracy_score(y_batch, clf_fixed.predict(X_b_fixed))
    
    accs_adaptive = {}
    for z in Z_SCORES_TO_TEST:
        accs_adaptive[z] = accuracy_score(y_batch, clfs_adaptive[z].predict(X_b_adaptive[z]))
    
    # B. CLUSTER ANALYSIS (Using static scaler data to ensure fair clustering)
    kmeans.partial_fit(X_b_static)
    kmeans_labels = kmeans.predict(X_b_static)
    
    best_gmm = None
    best_bic = np.inf
    # Test 2 to 5 components (need at least 2 for silhouette score)
    for n_components in range(2, 6):
        gmm = GaussianMixture(n_components=n_components, random_state=42)
        gmm.fit(X_b_static)
        bic = gmm.bic(X_b_static)
        if bic < best_bic:
            best_bic = bic
            best_gmm = gmm
            
    gmm_labels = best_gmm.predict(X_b_static)
    
    # C. METRICS
    try:
        k_sil = silhouette_score(X_b_static, kmeans_labels)
        g_sil = silhouette_score(X_b_static, gmm_labels)
    except ValueError:
        k_sil, g_sil = 0.0, 0.0
        
    # --- MODEL 1: STATIC ---
    # Does absolutely nothing. Never retrains.
    
    # --- MODEL 2: FIXED THRESHOLD ---
    if i == BATCH_SIZE:
        prev_kmeans_sil = k_sil
    delta_k = abs(k_sil - prev_kmeans_sil)
    if delta_k > FIXED_THRESHOLD:
        drifts_fixed += 1
        clf_fixed.partial_fit(X_b_fixed, y_batch)
        scaler_fixed.partial_fit(X_batch)
    prev_kmeans_sil = k_sil

    # --- MODEL 3: ADAPTIVE THRESHOLD (Tuning Multiple Z-Scores) ---
    if i == BATCH_SIZE:
        prev_gmm_sil = g_sil
        
    delta_g = abs(g_sil - prev_gmm_sil)
    
    for z in Z_SCORES_TO_TEST:
        threshold = 0.05 # Fallback
        if len(delta_history) >= WINDOW_SIZE:
            recent_deltas = delta_history[-WINDOW_SIZE:]
            threshold = np.mean(recent_deltas) + z * np.std(recent_deltas)
        
        if delta_g > threshold and len(delta_history) >= WINDOW_SIZE:
            drifts_adaptive[z] += 1
            clfs_adaptive[z].partial_fit(X_b_adaptive[z], y_batch)
            scalers_adaptive[z].partial_fit(X_batch)
            
    delta_history.append(delta_g)
    prev_gmm_sil = g_sil
    
    # LOGGING
    step = i // BATCH_SIZE
    log_entry = {
        'batch': step,
        'acc_static': acc_static,
        'acc_fixed': acc_fixed,
    }
    
    mlflow.log_metric("acc_static", acc_static, step=step)
    mlflow.log_metric("acc_fixed", acc_fixed, step=step)
    
    for z in Z_SCORES_TO_TEST:
        log_entry[f'acc_adaptive_z{z}'] = accs_adaptive[z]
        mlflow.log_metric(f"acc_adaptive_z{z}", accs_adaptive[z], step=step)
        
    metrics_log.append(log_entry)

# Output final evaluation metrics
df_metrics = pd.DataFrame(metrics_log)
df_metrics.to_csv("hyperparameter_tuning_log.csv", index=False)

print("\n--- HYPERPARAMETER TUNING LEADERBOARD ---")
print(f"Total Batches Processed: {len(df_metrics)}")
print("-" * 50)
print(f"MODEL 1 (Static):     Accuracy = {df_metrics['acc_static'].mean() * 100:.2f}% | Retrains = 0")
print(f"MODEL 2 (Fixed 0.05): Accuracy = {df_metrics['acc_fixed'].mean() * 100:.2f}% | Retrains = {drifts_fixed}")
for z in Z_SCORES_TO_TEST:
    print(f"ADAPTIVE (Z={z}):     Accuracy = {df_metrics[f'acc_adaptive_z{z}'].mean() * 100:.2f}% | Retrains = {drifts_adaptive[z]}")
print("-" * 50)

# Generate Comparison Plot
plt.figure(figsize=(12, 6))
plt.plot(df_metrics['batch'], df_metrics['acc_static'], label='Static', alpha=0.5, linestyle=':')
plt.plot(df_metrics['batch'], df_metrics['acc_fixed'], label='Fixed Threshold (0.05)', alpha=0.8, linestyle='--')

for z in Z_SCORES_TO_TEST:
    plt.plot(df_metrics['batch'], df_metrics[f'acc_adaptive_z{z}'], label=f'Adaptive (Z={z})', alpha=0.8)

plt.title('Hyperparameter Tuning: Model Accuracy Over Time')
plt.xlabel('Batch Number')
plt.ylabel('Accuracy')
plt.legend()
plt.tight_layout()
plt.savefig("hyperparameter_tuning_plot.png")
print("Accuracy plot saved to 'hyperparameter_tuning_plot.png'.")

# Log final metrics and artifacts to MLflow
mlflow.log_metric("final_retrains_fixed", drifts_fixed)
for z in Z_SCORES_TO_TEST:
    mlflow.log_metric(f"final_retrains_z{z}", drifts_adaptive[z])

mlflow.log_artifact("hyperparameter_tuning_plot.png")
mlflow.log_artifact("hyperparameter_tuning_log.csv")
mlflow.end_run()
