# 土地活用推進調査 PMTiles 表示 作業レポート

## 1. 目的

`05_ポリゴン表示` の地図上で、**国土数値情報 土地活用推進調査**のデータ（CSV 由来・160 ファイル分）を **PMTiles** として表示し、正しい位置で参照できるようにする。

---

## 2. 発生した問題と対応

### 2.1 レイヤが一切表示されない

- **原因**: 外部スタイル `https://tile.openstreetmap.jp/styles/osm-bright-ja/style.json` の読み込み失敗により `map.on('load')` が発火せず、ソース・レイヤが追加されていなかった。
- **対応**: スタイルは元の OSM 日本のまま維持。**サーバー側**で PMTiles 配信に必要な対応を行うことにした（次項）。

### 2.2 PMTiles が読み込めない（Content-Length / Range）

- **原因**: `python3 -m http.server` では、環境によって **Content-Length** が付与されない、または **HTTP Range** が正しく扱えず、PMTiles クライアントが「Server returned no content-length header」で失敗していた。
- **対応**: **`serve.py`** を新規作成。  
  - 全レスポンスに **Content-Length** を付与  
  - **Accept-Ranges: bytes** を返却  
  - **Range** リクエストには **206 Partial Content** と **Content-Range** で応答  
  - 起動時は必ずこのスクリプトを使うよう `readme.md` に記載。

### 2.3 プロット位置がずれる（海・山・建物上に表示）

- **原因**: 土地活用 CSV の **8列目・9列目** が「X, Y」ではなく **「Y, X」（北方向・東方向）** の並びだったのに、**X, Y** として解釈していたため、平面直角座標の取り違えで位置がずれていた。
- **対応**: **`csv_to_geoparquet_tochi.py`** を修正。  
  - 8列目 → **y**、9列目 → **x** に変更（平面直角: X=東方向・Y=北方向に合わせた解釈）。  
  - 変換済み GPKG を削除してから CSV → GPKG をやり直し、マージ・PMTiles を再作成。

### 2.4 単体 CSV で位置確認してから全量マージ

- **目的**: 全 160 件を一括処理する前に、1 件だけ PMTiles 化して位置が正しいか確認する。
- **対応**: **`single_csv_to_pmtiles.sh`** を新規作成。  
  - 指定した 1 個の CSV から col5（系番号）を取得し、対応する EPSG（6669～6687）で GPKG → PMTiles まで一括変換。  
  - 例: `TH_23521.csv` → `TH_23521.pmtiles`（系7）。  
  - 地図用に **TH_23521.pmtiles** 用レイヤ（オレンジ）を `main.js` に追加し、位置確認後に全量マージを実行。

---

## 3. データの流れ（パイプライン）

```
データ_origin/土地活用推進調査/*.csv（160 件）
  │
  ├─ csv_to_geoparquet_tochi.py（8列目→y, 9列目→x でヘッダ付与）
  │
  ▼
データ_geopackage_converted/土地活用推進調査/*.gpkg（160 件）
  │
  ├─ merge_tochi_geopackage.py（ファイルごとに col5 から系番号を取得し EPSG:6669～6687 → EPSG:3857 に変換して 1 本にマージ）
  │
  ▼
データ_geopackage_marged/土地活用推進調査_merged.gpkg
  │
  ├─ gpkg_to_pmtiles.sh（-t_srs EPSG:3857 を明示して PMTiles 出力）
  │
  ▼
データ_geopackage_marged/土地活用推進調査_merged.pmtiles
```

---

## 4. 主要なファイル・役割

| ファイル | 役割 |
|----------|------|
| `05_ポリゴン表示/serve.py` | PMTiles 用 HTTP サーバー（Content-Length・Range 対応）。地図表示時は必ずこれで起動。 |
| `05_ポリゴン表示/main.js` | 地図のソース・レイヤ定義。土地活用は `pmtiles_tochi`（紫）と、単体確認用 `pmtiles_tochi_single`（オレンジ・TH_23521）。 |
| `gdal-full/scripts/csv_to_geoparquet_tochi.py` | 土地活用 CSV の仮ヘッダ付与。**8列目→y, 9列目→x** で座標列を指定。 |
| `gdal-full/scripts/csv_to_geopackage.sh` | 全 CSV → GPKG 一括変換。土地活用は上記 Python を経由。 |
| `gdal-full/scripts/merge_tochi_geopackage.py` | 土地活用 GPKG 160 件を col5 の系番号に応じて 3857 に変換し 1 本にマージ。 |
| `gdal-full/scripts/gpkg_to_pmtiles.sh` | GPKG → PMTiles。`-t_srs EPSG:3857` を明示して位置ずれを防止。 |
| `gdal-full/scripts/single_csv_to_pmtiles.sh` | 1 個の CSV だけを PMTiles まで変換（位置確認用）。 |
| `05_ポリゴン表示/readme.md` | サーバー起動（serve.py）と、位置ずれ時の再変換手順を記載。 |

---

## 5. 現在の状態

- **土地活用推進調査** は 160 ファイル分が 1 本の **土地活用推進調査_merged.pmtiles** にまとまり、地図上で **正しい位置**（道路付近など）に表示される。
- 地図の表示には **`serve.py`** でサーバーを起動し、**http://localhost:8080/** でアクセスする。
- 背景は OSM 日本（osm-bright-ja）、土地活用は紫色の円/塗りで表示。単体確認用に TH_23521 をオレンジで表示するレイヤもあり（不要なら main.js で削除可能）。

---

## 6. 再実行する場合の手順（位置ずれ時やデータ更新時）

`05_ポリゴン表示/gdal-full` をカレントにし、`bash scripts/...` で実行すること。

```bash
cd 05_ポリゴン表示/gdal-full   # または MapLibre-HandsOn-Beginner/05_ポリゴン表示/gdal-full
source env.sh

rm -f "inputfile/20260219昨年納品DVD/05ホームページ公開用データ及びプログラム/データ_geopackage_converted/土地活用推進調査/"*.gpkg
bash scripts/csv_to_geopackage.sh
python3 scripts/merge_tochi_geopackage.py
bash scripts/gpkg_to_pmtiles.sh
```

ブラウザで地図を再読み込みすれば、更新された PMTiles が反映される。
