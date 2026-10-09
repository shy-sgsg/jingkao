# 数据模型

## 静态公开内容

- `src/science/knowledge.js`：四科知识树和稳定知识点 ID。
- `src/science/lessonContent.js`：结构化知识讲解。
- `src/science/questionBank.js`：题干、选项、答案、解析、来源 ID、知识点、难度、题型和发布状态。
- `src/science/sources.js`：来源标题、机构、类型、地区、年份、核验状态和引用链接。

构建脚本将这些 ES modules 内嵌到静态站点，不需要运行服务端。

## 个人档案字段

`studyPlanTasks` 保存独立计划任务。科学学习状态存入 `scienceStudy`：

- `knowledgeProgress`：知识点学习状态和时间。
- `sessions`：练习或限时模拟会话、题目顺序、当前进度、截止时间及草稿答案。
- `answers`：有效提交的作答事件。
- `mistakes`、`favorites`：错题与收藏。
- `favoriteKnowledgePointIds`、`unclearKnowledgePointIds`：知识点收藏和待复习标记。

练习会话逐题提交并记录复盘状态；限时模拟先保存草稿、交卷时形成正式答案记录。会话含单一 `planTaskId`。计划任务按关联会话内不同题目的 ID 汇总已答进度，重复做题不会重复计数；提高目标后可继续抽取未计入进度的题目，原会话和答案记录继续保留。

## 兼容与备份

缺少新字段的旧档案按空集合读取，原有档案字段保留。备份导出和恢复包含新任务与科学学习记录；导入器先验证结构，通过后才替换档案。浏览器档案在保存时加密；解锁后仅在当前设备内使用。
