import { getAptitudeModule } from './modules.js';

export function getAptitudeModuleLaunchAction(moduleId, mode) {
  const module = getAptitudeModule(moduleId);
  if (!module) throw new Error(`Unknown aptitude module: ${moduleId}`);
  if (mode !== 'practice' && mode !== 'exam') throw new Error('行测启动方式无效。');
  const action = module.id === 'science' ? 'open-science-practice'
    : module.id === 'general-knowledge' ? 'open-general-knowledge-practice'
      : 'start-aptitude-module-session';
  return { action, moduleId: module.id, mode };
}

export function renderAptitudeModuleLaunchButtons(moduleId) {
  const module = getAptitudeModule(moduleId);
  if (!module) throw new Error(`Unknown aptitude module: ${moduleId}`);
  return `<div class="aptitude-entry-launchers"><button type="button" class="button button-primary button-small" data-action="${getAptitudeModuleLaunchAction(moduleId, 'practice').action}" data-module-id="${module.id}" data-mode="practice" aria-label="${module.area}自由刷题">自由刷题</button><button type="button" class="button button-secondary button-small" data-action="${getAptitudeModuleLaunchAction(moduleId, 'exam').action}" data-module-id="${module.id}" data-mode="exam" aria-label="${module.area}模考刷题">模考刷题</button></div>`;
}
