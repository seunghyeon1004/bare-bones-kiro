# Sources for the two tables

Every rule in `apps/*/table.json` names one of the sources below. A rule that could not be tied to a line in one of them was left out. Read on 2026-11-12.

## Which bin? (South Korea, household separate discharge)

| Id | Source | Date | What it is |
| --- | --- | --- | --- |
| `seoul-2025` | Seoul Metropolitan Government, "헷갈리는 분리배출 기준, 서울시가 알려드립니다!" (Seoul's standard discharge rules), https://news.seoul.go.kr/env/archives/564022 | page updated 2025-08-06 | Seoul's unified rules for about 60 items, with Annex 1 (items that are not recyclable and where they go) and Annex 2, the Ministry of Environment's list of recyclable items and how to put them out |
| `moe-2018` | Ministry of Environment, "재활용품 분리배출 가이드라인" (Guidelines for separating recyclables), PDF dated 2018-08-30, copy hosted at https://sustainability.korea.ac.kr/files/Separation%20and%20discharge%20guide%20for%20recycling%20items%20(Ministry%20of%20Environment).pdf | 2018-08-30 | The Ministry's 36-page guide: per-material rules, an FAQ (pp. 21-25) and an A-to-Z item dictionary |

Rules are local in Korea: both documents say the details vary by city and district (지자체별 차이). The app says so and names Seoul.

The lines the table relies on, quoted, with an English gloss:

| Ref | Quote (Korean) | Gloss |
| --- | --- | --- |
| seoul-2025 A2 가 | 골판지상자 등: 비닐코팅 부분, 상자에 붙어있는 테이프ㆍ철핀, 알루미늄박 등을 제거하고 접어서 배출 | Cardboard boxes: remove plastic coating, tape, staples and foil, fold, put out as paper |
| seoul-2025 A1 1 | 택배용 보냉 상자류 등 내부에 알루미늄박, 비닐 등이 부착되어 종이와 분리되지 않는 상자류: 종량제봉투 | Insulated boxes with foil or plastic lining that cannot be separated: pay-as-you-throw (general waste) bag |
| moe-2018 dictionary, 피자박스 | 피자박스: 종이 / 기름에 오염된 내부 종이는 종량제봉투로 배출 | Pizza box: paper; inner paper soiled with grease goes in the general waste bag |
| seoul-2025 A2 나 (신문지, 책자) | 물기에 젖지 않도록 하고 반듯하게 펴서 차곡차곡 쌓은 후 묶어서 배출 / 비닐 코팅된 종이, 공책의 스프링 ... 제거 후 배출 | Newspapers, books, flyers: keep dry, flatten, stack and tie; remove plastic covers and spiral bindings |
| seoul-2025 A1 2 | 양면이 코팅된 종이컵, 비닐코팅 된 광고지, ..., 택배전표, 영수증 감열지, 사진용지, 종이호일, ..., 사용한 화장지 ...: 종량제봉투 | Paper cups coated on both sides, plastic-coated flyers, delivery labels, thermal receipts, photo paper, used tissues: general waste bag |
| moe-2018 FAQ p.21 | 물기만 닦은 핸드타월은 종이류로 배출합니다. 단, 이물질이 묻어 있는 경우에는 종량제봉투로 배출합니다. | Paper with dirt or food on it goes in the general waste bag |
| seoul-2025 A2 나 (종이컵) | 내용물을 비우고 물로 헹군 후 압착하여 봉투에 넣거나 한데 묶어서 배출 ※ 비해당품목 : 양면이 코팅된 종이컵 | Paper cups: empty, rinse, flatten, bag or tie together; not cups coated on both sides |
| moe-2018 FAQ p.21 | 깨끗한 종이컵은 종이류로 배출합니다. 단, 다량의 이물질이 묻어 있는 경우에는 종량제봉투로 배출합니다. | Clean cups go with paper; heavily soiled cups go in the general waste bag |
| seoul-2025 A2 나 (종이팩) | 내용물을 비우고 물로 헹구는 등 이물질을 제거하고 말린 후 배출 ... 종이팩 전용수거함에 배출 | Cartons (milk, juice): empty, rinse, dry, separate carton bin; if there is none, tie them and put them beside the paper |
| moe-2018 FAQ p.22 | 다량의 이물질이 묻어 있을 경우 종량제 봉투로 배출합니다. | Heavily soiled cartons: general waste bag |
| seoul-2025 A2 다 | 음료수병, 기타 병류: 내용물을 비우고 물로 헹구는 등 ... 소주, 맥주 등 빈용기보증금 대상 유리병은 소매점 등으로 반납 | Glass bottles: empty and rinse; deposit bottles (soju, beer) can go back to the shop |
| moe-2018 FAQ p.22 | 일반 유리잔이나 맥주컵은 유리병류로 배출합니다. 단, 내열유리는 ... 특수마대(불연물질)를 구매하여 배출 | Ordinary drinking glasses go with glass bottles; heat-resistant glass goes in a special non-combustibles sack |
| seoul-2025 A1 3 | 깨진 유리제품: (소량) 종량제봉투, (다량) 특수규격마대 / 코팅 및 다양한 색상이 들어간 유리제품, 내열 유리제품, 크리스탈 유리제품, 판유리, 조명기구용 유리류, 사기·도자기류: 특수규격마대 또는 대형폐기물 | Broken glass: wrapped, small amounts in the general bag, large amounts in a special sack. Heat-resistant, crystal, coated glass, window glass, ceramics: special sack or bulky waste |
| seoul-2025 A2 라 | 음료·주류캔, 식료품캔: 내용물을 비우고 물로 헹구는 등 ... 플라스틱 뚜껑 등 금속캔과 다른 재질은 제거 | Cans: empty, rinse, remove plastic lids |
| seoul-2025 A1 4 | 알루미늄 호일: 종량제봉투 | Aluminium foil: general waste bag |
| seoul-2025 A2 마 | 무색 투명한 먹는샘물, 음료 PET병: 내용물을 깨끗이 비우고 부착상표(라벨) 등을 제거한 후 가능한 압착하여 뚜껑을 닫아 배출 | Colourless clear water and drink bottles: empty, peel the label, squash, close the cap, put out separately |
| seoul-2025 A2 바 | 무색 투명한 ... PET병을 제외한 PET 용기(병을 포함한다)ㆍ트레이류, PVC, PE, PP, PS, PSP 재질 등의 용기·트레이류: 내용물을 비우고 물로 헹구는 등 ... 부착상표, 부속품 등 본체와 다른 재질은 제거 | Other plastic bottles, containers and trays: empty, rinse, remove labels and parts of other materials |
| seoul-2025 A2 사 | 비닐포장재, 1회용비닐봉투: 내용물을 비우고 물로 헹구는 등 ... 투명 또는 반투명 봉투에 담아 배출 / 비해당: 깨끗하게 이물질 제거가 되지 않은 랩필름 ... 종량제봉투 | Plastic film and bags: empty, rinse, in a clear bag; film that cannot be cleaned goes in the general bag |
| moe-2018 FAQ p.25 | 이물질 제거가 어려운 경우에는 종량제 봉투로 배출합니다. | Snack and noodle wrappers that cannot be cleaned: general bag |
| seoul-2025 A2 아, A1 7 | 스티로폼 완충재: 내용물을 비우고 물로 헹구는 등 ... 부착상표 ... 제거 / 음식물이 묻어 있거나 이물질을 제거하기 어려운 경우: 종량제봉투 | Styrofoam: empty, rinse, remove labels; with food on it: general bag |
| seoul-2025 A2 차 | 전지류: 전지를 제품에서 분리하여 배출 ... 주요 거점에 비치된 수거함에 배출 | Batteries: take them out of the device, put them in a battery collection box |
| seoul-2025 A2 카, A1 9 | 형광등: 지자체별 형광등 분리배출용기에 배출 / 깨진 형광등: (소량) 종량제봉투, (다량) 특수규격마대 | Fluorescent lamps: lamp collection box; broken ones: general bag (small amounts) or special sack |

Not found in either source, so not in the table as an answer: what to do with a plastic container that still has food or grease on it after rinsing. The table sends that case to "Ask your district office" instead of guessing.

## Which licence?

| Id | Source | What it is |
| --- | --- | --- |
| `choosealicense` | choosealicense.com licence data, https://github.com/github/choosealicense.com, branch `gh-pages` at commit `687dabb300c3d58891285d9567cc6f73a495470c`, files `_licenses/*.txt` | The front matter of seven licences (title, SPDX id, description, permissions, conditions, limitations), copied unchanged into `choosealicense/*.yml` here. choosealicense.com content is licensed under CC BY 3.0 (https://creativecommons.org/licenses/by/3.0/). |

The seven: MIT, Apache-2.0, Unlicense, MPL-2.0, LGPL-3.0, GPL-3.0, AGPL-3.0. The facts the table uses: which ones carry `patent-use`, which require `include-copyright`, and which copyleft scope each has (`same-license--file` for MPL-2.0, `same-license--library` for LGPL-3.0, `same-license` for GPL-3.0 and AGPL-3.0, `network-use-disclose` for AGPL-3.0 only). The app is not legal advice and says so.
