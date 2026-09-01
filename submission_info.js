/**
 * HydroShield AI - Submission Info & Presentation Manager
 * Handles Devpost Hackathon presentation modal tabs and submission packet data.
 */

export function setupSubmissionModal() {
  const modal = document.getElementById('modal-hackathon-pitch');
  const btnOpen = document.getElementById('btn-toggle-hackathon-info');
  const btnClose = document.getElementById('btn-close-modal');
  const btnCloseFooter = document.getElementById('btn-close-modal-footer');

  const tabs = document.querySelectorAll('.pitch-tab');
  const contents = document.querySelectorAll('.tab-content');

  function openModal() {
    modal.classList.add('open');
  }

  function closeModal() {
    modal.classList.remove('open');
  }

  if (btnOpen) btnOpen.addEventListener('click', openModal);
  if (btnClose) btnClose.addEventListener('click', closeModal);
  if (btnCloseFooter) btnCloseFooter.addEventListener('click', closeModal);

  // Close when clicking background backdrop
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  // Tab switching logic
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      contents.forEach(c => c.classList.remove('active'));

      tab.classList.add('active');
      const tabId = `tab-${tab.getAttribute('data-tab')}`;
      const activeContent = document.getElementById(tabId);
      if (activeContent) activeContent.classList.add('active');
    });
  });
}
