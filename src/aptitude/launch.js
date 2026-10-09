import { getAptitudeModule } from './modules.js';
import { getAptitudeQuestions } from './questions.js';

export function getAptitudeModuleLaunchAction(moduleId, mode) {
  const module = getAptitudeModule(moduleId);
  if (!module) throw new Error(`Unknown aptitude module: ${moduleId}`);
  if (mode !== 'practice' && mode !== 'exam') throw new Error('行测启动方式无效。');
  const action = module.id === 'science' ? 'open-science-practice'
    : module.id === 'general-knowledge' ? 'open-general-knowledge-practice'
      : 'open-aptitude-module-practice';
  return { action, moduleId: module.id, mode };
}

export function renderAptitudeModuleLaunchButtons(moduleId) {
  const module = getAptitudeModule(moduleId);
  if (!module) throw new Error(`Unknown aptitude module: ${moduleId}`);
  const available = getAptitudeQuestions(moduleId).length > 0;
  const disabled = available ? '' : 'disabled aria-disabled="true" title="题库待接入"';
  const practiceAction = available ? `data-action="${getAptitudeModuleLaunchAction(moduleId, 'practice').action}"` : '';
  const examAction = available ? `data-action="${getAptitudeModuleLaunchAction(moduleId, 'exam').action}"` : '';
  return `<div class="aptitude-entry-launchers"><button type="button" class="button button-primary button-small" ${practiceAction} data-module-id="${module.id}" data-mode="practice" aria-label="${module.area}自由刷题" ${disabled}>自由刷题</button><button type="button" class="button button-secondary button-small" ${examAction} data-module-id="${module.id}" data-mode="exam" aria-label="${module.area}模考刷题" ${disabled}>模考刷题</button></div>`;
}
