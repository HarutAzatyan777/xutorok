# Xutorok Menu Photo Matching Report

- **Generated At:** `2026-11-12T07:32:44.166Z`
- **Catalog Source:** `live-firestore` (297 products across 29 categories)
- **Total Source JPGs:** **136** (128 food images + 8 reserved `Restaurant` branding images)

## 1. Matching Classification Summary

| Classification | Count | Auto-Approval Policy |
| :--- | ---: | :--- |
| **EXACT** (Unique exact match in category) | **104** | Bulk-approved (unambiguous 1:1) |
| **HIGH** (Strong category-consistent match) | **9** | Bulk-approved (unambiguous 1:1) |
| **REVIEW** (Plausible but ambiguous / conflict) | **6** | **Held for human review (NOT auto-approved)** |
| **UNMATCHED** (No corresponding product in catalog) | **9** | **Not matched (NOT auto-approved)** |
| **RESERVED** (`Restaurant` branding/gallery folder) | **8** | **Reserved (excluded from product attachment)** |
| **TOTAL** | **136** | **113 Approved Ready** |

## 2. High-Confidence (Non-Exact) Unambiguous Matches (9)

| Image ID | Relative Path | Matched Product ID | Product Name (HY / RU / EN) | Match Reason |
| :--- | :--- | :--- | :--- | :--- |
| `img-002` | `ԱՂԱՆԴԵՐ\Դեսերտ խուտորոկ.JPG` | `xutorok-item-141` | Դեսերտ Խուտոռոկ / Десерт Хуторок / Dessert Khutorok | Strong category-consistent match to "Դեսերտ Խուտոռոկ" (orthographic: խուտորոկ → խուտոռոկ). |
| `img-087` | `ՏԱՔ ՈՒՏԵՍՏՆԵՐ\Արցախյան ժառկո.JPG` | `xutorok-item-100` | Արցախյան տապակա / Жаркое по арцахски / Artsakh roast | Strong category-consistent match to "Արցախյան տապակա" (culinary synonym (RU Жаркое): ժառկո → տապակա). |
| `img-096` | `ՏԱՔ ՈՒՏԵՍՏՆԵՐ\Դոլմա խաղողի թփով.JPG` | `xutorok-item-087` | Դոլմա խաղողի թփով (7 հատ) / Толма из виноградных листьев (7 шт.) / Dolma with grape leaves (7 pcs) | Strong category-consistent match to "Դոլմա խաղողի թփով (7 հատ)" (portion count suffix omitted in filename ("Դոլմա խաղողի թփով (7 հատ)")). |
| `img-097` | `ՏԱՔ ՈՒՏԵՍՏՆԵՐ\Դոլմա կաղամբով.JPG` | `xutorok-item-088` | Դոլմա կաղամբով (5 հատ) / Долма с капустой (5 шт.) / Dolma with cabbage (5 pcs) | Strong category-consistent match to "Դոլմա կաղամբով (5 հատ)" (portion count suffix omitted in filename ("Դոլմա կաղամբով (5 հատ)")). |
| `img-108` | `ՏԱՔ ՈՒՏԵՍՏՆԵՐ\Ճուտ տապակա.JPG` | `xutorok-item-103` | Ճտի տապակա / Цыпленок жареный / Roasted poussin | Strong category-consistent match to "Ճտի տապակա" (inflection: ճուտ տապակա → ճտի տապակա). |
| `img-119` | `ՏԱՔ ՈՒՏԵՍՏՆԵՐ\Վարեննիկներ կաթնաշոռով.JPG` | `xutorok-item-068` | Վարենիկներ կաթնաշոռով / Вареники с творогом / Dumplings with cottage cheese | Strong category-consistent match to "Վարենիկներ կաթնաշոռով" (orthographic: վարեննիկներ → վարենիկներ). |
| `img-120` | `ՏԱՔ ՈՒՏԵՍՏՆԵՐ\Վարեննիկներ կաղամբով.JPG` | `xutorok-item-065` | Վարենիկներ կաղամբով / Вареники с капустой / Dumplings with cabbage | Strong category-consistent match to "Վարենիկներ կաղամբով" (orthographic: վարեննիկներ → վարենիկներ). |
| `img-121` | `ՏԱՔ ՈՒՏԵՍՏՆԵՐ\Վարեննիկներ կարտոֆիլով և սնկով.JPG` | `xutorok-item-064` | Վարենիկներ կարտոֆիլով և սնկով / Вареники с картошкой и грибами / Dumplings with potatoes and mushrooms | Strong category-consistent match to "Վարենիկներ կարտոֆիլով և սնկով" (orthographic: վարեննիկներ → վարենիկներ). |
| `img-122` | `ՏԱՔ ՈՒՏԵՍՏՆԵՐ\Վարեննիկներ տավարի մսով.JPG` | `xutorok-item-067` | Վարենիկներ տավարի մսով / Вареники с говядиной / Dumplings with beef | Strong category-consistent match to "Վարենիկներ տավարի մսով" (orthographic: վարեննիկներ → վարենիկներ). |

## 3. Ambiguous / Conflict Items Requiring Review (6)

| Image ID | Relative Path | Conflict Type | Candidate Product(s) | Warning / Explanation |
| :--- | :--- | :--- | :--- | :--- |
| `img-053` | `ԽՈՐՈՎԱԾ\Հավի քաբաբ.JPG` | `multiple_images_to_one_product` | `xutorok-item-119` (Քաբաբ հավի և տավարի) | 2 images (Հավի քաբաբ.JPG, Տավարի քաբաբ.JPG) match the same product "Քաբաբ հավի և տավարի" (xutorok-item-119). Retain all candidates for review. |
| `img-056` | `ԽՈՐՈՎԱԾ\Տավարի քաբաբ.JPG` | `multiple_images_to_one_product` | `xutorok-item-119` (Քաբաբ հավի և տավարի) | 2 images (Հավի քաբաբ.JPG, Տավարի քաբաբ.JPG) match the same product "Քաբաբ հավի և տավարի" (xutorok-item-119). Retain all candidates for review. |
| `img-069` | `ՆԱԽՈՒՏԵՍՏՆԵՐ\Ձկան տեսականի-2.JPG` | `multiple_images_to_one_product` | `xutorok-item-015` (Ձկան տեսականի) | 2 images (Ձկան տեսականի-2.JPG, Ձկան տեսականի.JPG) match the same product "Ձկան տեսականի" (xutorok-item-015). Retain all candidates for review. |
| `img-070` | `ՆԱԽՈՒՏԵՍՏՆԵՐ\Ձկան տեսականի.JPG` | `multiple_images_to_one_product` | `xutorok-item-015` (Ձկան տեսականի) | 2 images (Ձկան տեսականի-2.JPG, Ձկան տեսականի.JPG) match the same product "Ձկան տեսականի" (xutorok-item-015). Retain all candidates for review. |
| `img-072` | `ՆԱԽՈՒՏԵՍՏՆԵՐ\Ուկրաինական մսի տեսականի.JPG` | `ambiguous_candidates` | `xutorok-item-009` (Մսի տեսականի), `xutorok-item-010` (Ուկրաինական սեթ մեծ), `xutorok-item-011` (Ուկրաինական սեթ փոքր) | Ambiguous match between "Մսի տեսականի" (xutorok-item-009) and "Ուկրաինական սեթ մեծ" (xutorok-item-010) and "Ուկրաինական սեթ փոքր" (xutorok-item-011). |
| `img-114` | `ՏԱՔ ՈՒՏԵՍՏՆԵՐ\Պելմենի յուղաձկով, թունայով, սաղմոնով.JPG` | `one_image_to_multiple_products` | `xutorok-item-059` (Պելմենի յուղաձկով), `xutorok-item-060` (Պելմենի սաղմոնով), `xutorok-item-061` (Պելմենի թունայով) | One composite image matches 3 separate menu products: Պելմենի յուղաձկով (xutorok-item-059), Պելմենի սաղմոնով (xutorok-item-060), Պելմենի թունայով (xutorok-item-061). Requires manual review decision. |

## 4. Unmatched Food Images (9)

| Image ID | Relative Path | Source Folder | Explanation |
| :--- | :--- | :--- | :--- |
| `img-006` | `ԱՂԱՆԴԵՐ\Վարենիկներ սպանախով և ելակով.JPG` | `ԱՂԱՆԴԵՐ` | No reliable product match found in category "Աղանդեր" for "Վարենիկներ սպանախով և ելակով". |
| `img-079` | `Պիցցա\4 տեսակ պանիր.jpg` | `Պիցցա` | Source folder "Պիցցա" has no corresponding category or products in the existing 297-item Xutorok catalog. |
| `img-080` | `Պիցցա\Բանջարեղենային.jpg` | `Պիցցա` | Source folder "Պիցցա" has no corresponding category or products in the existing 297-item Xutorok catalog. |
| `img-081` | `Պիցցա\Իմերեթական և Աջարական.jpg` | `Պիցցա` | Source folder "Պիցցա" has no corresponding category or products in the existing 297-item Xutorok catalog. |
| `img-082` | `Պիցցա\Կարբոնարա.jpg` | `Պիցցա` | Source folder "Պիցցա" has no corresponding category or products in the existing 297-item Xutorok catalog. |
| `img-083` | `Պիցցա\Կեսար.jpg` | `Պիցցա` | Source folder "Պիցցա" has no corresponding category or products in the existing 297-item Xutorok catalog. Blocked 1 cross-category homonym(s). |
| `img-084` | `Պիցցա\Մարգարիտա.jpg` | `Պիցցա` | Source folder "Պիցցա" has no corresponding category or products in the existing 297-item Xutorok catalog. Blocked 1 cross-category homonym(s). |
| `img-085` | `Պիցցա\Պեպպերոնի.jpg` | `Պիցցա` | Source folder "Պիցցա" has no corresponding category or products in the existing 297-item Xutorok catalog. |
| `img-086` | `Պիցցա\Պրոշուտտո.jpg` | `Պիցցա` | Source folder "Պիցցա" has no corresponding category or products in the existing 297-item Xutorok catalog. |
