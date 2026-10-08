# 昌平京考看板数据覆盖报告

数据基准日：2026-10-08。本报告由 `scripts/build_data.py` 根据生成数据自动更新。年度官方职位分母未取得时只展示可见样例和二手参考，不把参考数写成官方覆盖率。

## 年度可见职位

| 年度 | 已导入职位行 | 已知招录人数 | 具名分数（唯一代码关联 / 样例行） | 官方职位行 |
| ---: | ---: | ---: | ---: | ---: |
| 2024 | 95 | 197 | 0 / 0 | 0 |
| 2025 | 91 | 177 | 0 / 0 | 0 |
| 2026 | 86 | 136 | 25 / 31 | 0 |

合计 272 条候选职位、510 个已知招录名额；来源注册表 136 项（官方 12、二手 124）。来源条目数不等于逐岗官方核验数。

## 结构化字段覆盖

字段有值只表示当前镜像可见，不表示完整或已由官方核实。`专业代码目录` 不等同于资格条件完整。

| 年度 | 专业代码目录 | 结构化要求 | 资格完整 | 二手交叉字段一致 | 职位简介 | 专业测试字段 | 体测字段 | 面试比例 | 电话 / 网站 |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 2024 | 52 / 95 | 0 / 95 | 0 / 95 | 0 / 95 | 0 / 95 | 0 / 95 | 0 / 95 | 0 / 95 | 0 / 95 |
| 2025 | 71 / 91 | 2 / 91 | 0 / 91 | 90 / 91 | 1 / 91 | 1 / 91 | 0 / 91 | 2 / 91 | 1 / 91 |
| 2026 | 62 / 86 | 11 / 86 | 0 / 86 | 0 / 86 | 1 / 86 | 6 / 86 | 4 / 86 | 10 / 86 | 0 / 86 |

## 二手年度汇总与职位差额

| 年度 | 可见二手汇总（职位 / 招录） | 与当前行级样例的关系 |
| ---: | --- | --- |
| 2024 | [huatu-2024-list](https://ah.huatu.com/zw/bjgwy/changpingzw/2024.html) 95 岗 / 197 人; [gwyzwb-2024-list](https://bj.gwyzwb.com/changping/2024.html) 93 岗 / 142 人; [gaodun-2024-list](https://www.gaodun.com/gwy/1608885.html) 97 岗 / 199 人 | 二手来源总数不一致；不计算年度覆盖率或总量差额 |
| 2025 | [huatu-2025-list](https://huangshan.huatu.com/zw/bjgwy/changpingzw/) 91 岗 / 177 人; [gwyzwb-2025-list](https://bj.gwyzwb.com/changping/2025.html) 91 岗 / 177 人; [eoffcn-2025-list](https://www.eoffcn.com/kszx/detail/1521605.html) 90 岗 / 176 人; [gwyzwb-2025-org-1](https://bj.gwyzwb.com/changping/2025_1.html) 2 岗 / 40 人; [gwyzwb-2025-org-2](https://bj.gwyzwb.com/changping/2025_2.html) 3 岗 / 5 人; [gwyzwb-2025-org-3](https://bj.gwyzwb.com/changping/2025_3.html) 2 岗 / 2 人; [gwyzwb-2025-org-4](https://bj.gwyzwb.com/changping/2025_4.html) 1 岗 / 1 人; [gwyzwb-2025-org-5](https://bj.gwyzwb.com/changping/2025_5.html) 3 岗 / 10 人; [gwyzwb-2025-org-6](https://bj.gwyzwb.com/changping/2025_6.html) 6 岗 / 22 人; [gwyzwb-2025-org-7](https://bj.gwyzwb.com/changping/2025_7.html) 1 岗 / 2 人; [gwyzwb-2025-org-8](https://bj.gwyzwb.com/changping/2025_8.html) 1 岗 / 1 人; [gwyzwb-2025-org-9](https://bj.gwyzwb.com/changping/2025_9.html) 1 岗 / 2 人; [gwyzwb-2025-org-10](https://bj.gwyzwb.com/changping/2025_10.html) 1 岗 / 1 人; [gwyzwb-2025-org-11](https://bj.gwyzwb.com/changping/2025_11.html) 2 岗 / 2 人; [gwyzwb-2025-org-12](https://bj.gwyzwb.com/changping/2025_12.html) 2 岗 / 3 人; [gwyzwb-2025-org-13](https://bj.gwyzwb.com/changping/2025_13.html) 1 岗 / 2 人; [gwyzwb-2025-org-14](https://bj.gwyzwb.com/changping/2025_14.html) 1 岗 / 1 人; [gwyzwb-2025-org-15](https://bj.gwyzwb.com/changping/2025_15.html) 1 岗 / 2 人; [gwyzwb-2025-org-16](https://bj.gwyzwb.com/changping/2025_16.html) 5 岗 / 9 人; [gwyzwb-2025-org-17](https://bj.gwyzwb.com/changping/2025_17.html) 1 岗 / 1 人; [gwyzwb-2025-org-18](https://bj.gwyzwb.com/changping/2025_18.html) 2 岗 / 2 人; [gwyzwb-2025-org-19](https://bj.gwyzwb.com/changping/2025_19.html) 5 岗 / 5 人; [gwyzwb-2025-org-20](https://bj.gwyzwb.com/changping/2025_20.html) 1 岗 / 2 人; [gwyzwb-2025-org-21](https://bj.gwyzwb.com/changping/2025_21.html) 1 岗 / 2 人; [gwyzwb-2025-org-22](https://bj.gwyzwb.com/changping/2025_22.html) 1 岗 / 1 人; [gwyzwb-2025-org-23](https://bj.gwyzwb.com/changping/2025_23.html) 1 岗 / 3 人; [gwyzwb-2025-org-24](https://bj.gwyzwb.com/changping/2025_24.html) 4 岗 / 9 人; [gwyzwb-2025-org-25](https://bj.gwyzwb.com/changping/2025_25.html) 1 岗 / 2 人; [gwyzwb-2025-org-26](https://bj.gwyzwb.com/changping/2025_26.html) 11 岗 / 12 人; [gwyzwb-2025-org-27](https://bj.gwyzwb.com/changping/2025_27.html) 1 岗 / 2 人; [gwyzwb-2025-org-28](https://bj.gwyzwb.com/changping/2025_28.html) 1 岗 / 1 人; [gwyzwb-2025-org-29](https://bj.gwyzwb.com/changping/2025_29.html) 1 岗 / 1 人; [gwyzwb-2025-org-30](https://bj.gwyzwb.com/changping/2025_30.html) 1 岗 / 1 人; [gwyzwb-2025-org-31](https://bj.gwyzwb.com/changping/2025_31.html) 1 岗 / 2 人; [gwyzwb-2025-org-32](https://bj.gwyzwb.com/changping/2025_32.html) 1 岗 / 1 人; [gwyzwb-2025-org-33](https://bj.gwyzwb.com/changping/2025_33.html) 1 岗 / 1 人; [gwyzwb-2025-org-34](https://bj.gwyzwb.com/changping/2025_34.html) 1 岗 / 1 人; [gwyzwb-2025-org-35](https://bj.gwyzwb.com/changping/2025_35.html) 2 岗 / 3 人; [gwyzwb-2025-org-36](https://bj.gwyzwb.com/changping/2025_36.html) 1 岗 / 1 人; [gwyzwb-2025-org-37](https://bj.gwyzwb.com/changping/2025_37.html) 3 岗 / 3 人; [gwyzwb-2025-org-38](https://bj.gwyzwb.com/changping/2025_38.html) 1 岗 / 1 人; [gwyzwb-2025-org-39](https://bj.gwyzwb.com/changping/2025_39.html) 2 岗 / 2 人; [gwyzwb-2025-org-40](https://bj.gwyzwb.com/changping/2025_40.html) 2 岗 / 2 人; [gwyzwb-2025-org-41](https://bj.gwyzwb.com/changping/2025_41.html) 1 岗 / 1 人; [gwyzwb-2025-org-42](https://bj.gwyzwb.com/changping/2025_42.html) 3 岗 / 3 人; [gwyzwb-2025-org-43](https://bj.gwyzwb.com/changping/2025_43.html) 2 岗 / 2 人; [gwyzwb-2025-org-44](https://bj.gwyzwb.com/changping/2025_44.html) 3 岗 / 3 人; [gwyzwb-2025-org-45](https://bj.gwyzwb.com/changping/2025_45.html) 1 岗 / 1 人; [gwyzwb-2025-org-46](https://bj.gwyzwb.com/changping/2025_46.html) 1 岗 / 1 人; [huatu-2025-job-231266001](https://ah.huatu.com/zw/bjgwy/2025/1393.html) 1 岗 / 1 人 | 二手来源总数不一致；不计算年度覆盖率或总量差额 |
| 2026 | [huatu-2026-list](https://ah.huatu.com/zw/bjgwy/changping/) 88 岗 / 138 人; [gwyzwb-2026-list](https://bj.gwyzwb.com/changping/) 88 岗 / 138 人; [huatu-2026-org-2](https://ah.huatu.com/zw/bjgwy/changping/2026_2.html) 3 岗 / 5 人; [huatu-2026-org-3](https://ah.huatu.com/zw/bjgwy/changping/2026_3.html) 2 岗 / 3 人; [huatu-2026-org-5](https://ah.huatu.com/zw/bjgwy/changping/2026_5.html) 3 岗 / 6 人; [huatu-2026-org-6](https://ah.huatu.com/zw/bjgwy/changping/2026_6.html) 4 岗 / 8 人; [huatu-2026-org-8](https://ah.huatu.com/zw/bjgwy/changping/2026_8.html) 1 岗 / 1 人; [huatu-2026-org-11](https://ah.huatu.com/zw/bjgwy/changping/2026_11.html) 2 岗 / 3 人; [huatu-2026-org-12](https://ah.huatu.com/zw/bjgwy/changping/2026_12.html) 1 岗 / 2 人; [huatu-2026-org-17](https://ah.huatu.com/zw/bjgwy/changping/2026_17.html) 3 岗 / 4 人; [huatu-2026-org-19](https://ah.huatu.com/zw/bjgwy/changping/2026_19.html) 2 岗 / 3 人; [huatu-2026-org-20](https://ah.huatu.com/zw/bjgwy/changping/2026_20.html) 1 岗 / 2 人; [huatu-2026-job-821262001](https://ah.huatu.com/zw/bjgwy/2026/1230.html) 1 岗 / 2 人; [huatu-2026-job-221261803](https://ah.huatu.com/zw/bjgwy/2026/1227.html) 1 岗 / 2 人; [huatu-2026-org-28](https://ah.huatu.com/zw/bjgwy/changping/2026_28.html) 1 岗 / 1 人; [huatu-2026-org-34](https://ah.huatu.com/zw/bjgwy/changping/2026_34.html) 1 岗 / 1 人; [huatu-2026-job-231264501](https://ah.huatu.com/zw/bjgwy/2026/1651.html) 1 岗 / 1 人; [fenbi-2026-changping-list](https://m.fenbi.com/page/positions/1/438923?region=161) 80 岗 / 114 人; [huatu-2026-job-221262201](https://ah.huatu.com/zw/bjgwy/2026/1233.html) 1 岗 / 1 人; [huatu-2026-job-221262401](https://ah.huatu.com/zw/bjgwy/2026/1235.html) 1 岗 / 2 人; [gwyzwb-2026-job-221262601](https://bj.gwyzwb.com/2026/1244.html) 1 岗 / 1 人; [gwyzwb-2026-org-29](https://bj.gwyzwb.com/changping/2026_29.html) 1 岗 / 1 人; [huatu-2026-job-821263101](https://ah.huatu.com/zw/bjgwy/2026/1249.html) 1 岗 / 2 人; [gwyzwb-2026-org-30](https://bj.gwyzwb.com/changping/2026_30.html) 1 岗 / 2 人; [gwyzwb-2026-job-231264601](https://bj.gwyzwb.com/2026/1265.html) 1 岗 / 1 人; [gwyzwb-2026-job-241264201](https://bj.gwyzwb.com/2026/1649.html) 1 岗 / 1 人; [gwyzwb-2026-job-241264202](https://bj.gwyzwb.com/2026/1264.html) 1 岗 / 1 人; [gwyzwb-2026-job-241264902](https://bj.gwyzwb.com/2026/1270.html) 1 岗 / 1 人 | 二手来源总数不一致；不计算年度覆盖率或总量差额 |

单位汇总参考来源为 `huatu-2026-list`；以下 2026 单位级差额仅用于定位二手镜像中可见的收录差异，不等于已取得缺失岗位代码或官方核验。

| 单位 | 镜像岗位 / 招录 | 已导入岗位 / 招录 | 镜像差额 |
| --- | ---: | ---: | ---: |
| 北京市昌平区人力资源和社会保障局 | 3 / 6 | 3 / 6 | 缺 0 岗 / 0 人 |
| 北京市昌平区天通苑北街道 | 1 / 1 | 0 / 0 | 缺 1 岗 / 1 人 |
| 北京市昌平区百善镇 | 2 / 2 | 2 / 2 | 缺 0 岗 / 0 人 |
| 北京市昌平区延寿镇 | 2 / 2 | 1 / 1 | 缺 1 岗 / 1 人 |
| 北京市昌平区阳坊镇 | 1 / 1 | 1 / 1 | 缺 0 岗 / 0 人 |
| 北京市昌平区北七家镇 | 1 / 1 | 1 / 1 | 缺 0 岗 / 0 人 |

## 进面线与报名观察

具名最低进面分共 31 行（唯一代码关联 25 行）；分数样本范围记录 1 条。面试最低进面线不等同笔试合格线。
范围观察共 13 条：岗位级 9、单位级 1、区级范围 3。其中有资格审查通过数的 12 条；报名数 0、缴费数 0、确认参考数 0、实际参考人数 0 条。过程快照不等同最终人数。

## 校验结论

COVERAGE: INCOMPLETE — 年度官方职位总量分母未核实。结构校验请运行 `python3 scripts/validate_data.py`；本报告不把二手参考数表述为官方全量。

2024 年公开二手汇总存在总量差异，2025 年汇总也有小幅差异；职位代码集合差集尚未完成。2024、2025 暂无具名进面分行。原始学习计划 Excel 未被修改。
