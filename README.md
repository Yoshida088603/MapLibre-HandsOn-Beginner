# 【初級編】MapLibre GL JS を使った WebGIS 作成 サンプルコード

## 概要

【初級編】MapLibre GL JS を使った WebGIS 作成で利用したサンプルコードを公開しています。  
地図表示には MapLibre GL JS と PMTiles を使用し、**05_ポリゴン表示** でポリゴン・ポイントなどのベクタタイルを表示します。

## データの出典

- **背景地図**: OpenStreetMap（osm-bright-ja など）
- **ポイント**: [国土数値情報 観光資源データ](https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-P12-v2_2.html) の平成26年度 東京都のデータを GeoJSON に加工
- **ライン**: [国土数値情報 バスルートデータ](https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N07.html) の平成23年度 東京都のデータを GeoJSON に加工
- **ポリゴン**: [国土数値情報 工業用地データ](https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-L05.html) の平成21年度 東京都のデータを GeoJSON に加工
- **土地活用推進調査**: 国土数値情報の土地活用推進調査 CSV（160 ファイル）を PMTiles に変換して表示

---

## 05_ポリゴン表示の起動方法

PMTiles 表示には **Content-Length** と **HTTP Range** 対応が必要なため、通常の `python3 -m http.server` では動作しません。

**必ず `serve.py` を使って起動してください。**

```bash
cd MapLibre-HandsOn-Beginner/05_ポリゴン表示
python3 serve.py
```

起動後、ブラウザで **http://localhost:8080/** を開いて地図を表示します。  
詳細は [05_ポリゴン表示/readme.md](05_ポリゴン表示/readme.md) を参照してください。

---

## 土地活用推進調査の PMTiles 表示

### 目的

`05_ポリゴン表示` の地図上で、**国土数値情報 土地活用推進調査**のデータ（CSV 由来・160 ファイル分）を **PMTiles** として表示し、正しい位置で参照できるようにする。

### 発生した問題と対応

| 問題 | 原因 | 対応 |
|------|------|------|
| レイヤが一切表示されない | 外部スタイル読み込み失敗で `map.on('load')` が発火しない可能性 | サーバー側で PMTiles 配信を正しく行う（`serve.py`） |
| PMTiles が読み込めない | `python3 -m http.server` で Content-Length や Range が正しく扱えない | **`serve.py`** を新規作成（Content-Length 付与、Accept-Ranges、206 Partial Content 対応） |
| プロット位置がずれる（海・山・建物上） | CSV の 8・9列目が「Y, X」並びなのに「X, Y」として解釈していた | **`csv_to_geoparquet_tochi.py`** で 8列目→y、9列目→x に変更し、変換・マージをやり直し |
| 全量の前に位置確認したい | 160 件一括前に 1 件だけ検証したい | **`single_csv_to_pmtiles.sh`** で 1 個の CSV を PMTiles まで変換（例: TH_23521） |

### データの流れ（パイプライン）

```
データ_origin/土地活用推進調査/*.csv（160 件）
  │  csv_to_geoparquet_tochi.py（8列目→y, 9列目→x）
  ▼
データ_geopackage_converted/土地活用推進調査/*.gpkg（160 件）
  │  merge_tochi_geopackage.py（col5 で系番号取得、EPSG:6669～6687 → 3857 でマージ）
  ▼
データ_geopackage_marged/土地活用推進調査_merged.gpkg
  │  gpkg_to_pmtiles.sh（-t_srs EPSG:3857 で PMTiles 出力）
  ▼
データ_geopackage_marged/土地活用推進調査_merged.pmtiles
```

### 主要なファイル・役割

| ファイル | 役割 |
|----------|------|
| `05_ポリゴン表示/serve.py` | PMTiles 用 HTTP サーバー（Content-Length・Range 対応）。地図表示時は必ずこれで起動。 |
| `05_ポリゴン表示/main.js` | 地図のソース・レイヤ定義。土地活用は `pmtiles_tochi`（紫）、単体確認用 `pmtiles_tochi_single`（オレンジ・TH_23521）。 |
| `05_ポリゴン表示/gdal-full/scripts/csv_to_geoparquet_tochi.py` | 土地活用 CSV の仮ヘッダ付与。**8列目→y, 9列目→x**。 |
| `05_ポリゴン表示/gdal-full/scripts/csv_to_geopackage.sh` | 全 CSV → GPKG 一括変換。土地活用は上記 Python を経由。 |
| `05_ポリゴン表示/gdal-full/scripts/merge_tochi_geopackage.py` | 土地活用 GPKG 160 件を col5 の系に応じて 3857 に変換し 1 本にマージ。 |
| `05_ポリゴン表示/gdal-full/scripts/gpkg_to_pmtiles.sh` | GPKG → PMTiles。`-t_srs EPSG:3857` を明示。 |
| `05_ポリゴン表示/gdal-full/scripts/single_csv_to_pmtiles.sh` | 1 個の CSV だけを PMTiles まで変換（位置確認用）。 |

### 現在の状態

- 土地活用推進調査 160 ファイル分が **土地活用推進調査_merged.pmtiles** にまとまり、地図上で **正しい位置**（道路付近など）に表示される。
- 地図の表示には **`serve.py`** でサーバーを起動し、**http://localhost:8080/** でアクセスする。
- 背景は OSM 日本、土地活用は紫色の円/塗り。単体確認用に TH_23521 をオレンジで表示するレイヤもあり（不要なら main.js で削除可能）。

### 再実行する場合の手順（位置ずれ時やデータ更新時）

`05_ポリゴン表示/gdal-full` をカレントにし、**`bash scripts/...`** で実行すること。

```bash
cd MapLibre-HandsOn-Beginner/05_ポリゴン表示/gdal-full
# すでに gdal-full にいる場合は cd は不要

source env.sh

rm -f "inputfile/20260219昨年納品DVD/05ホームページ公開用データ及びプログラム/データ_geopackage_converted/土地活用推進調査/"*.gpkg
bash scripts/csv_to_geopackage.sh
python3 scripts/merge_tochi_geopackage.py
bash scripts/gpkg_to_pmtiles.sh
```

ブラウザで地図を再読み込みすれば、更新された PMTiles が反映されます。

---

## 参照

- [05_ポリゴン表示/readme.md](05_ポリゴン表示/readme.md) — サーバー起動と位置ずれ時の手順
- [05_ポリゴン表示/docs/土地活用推進調査_PMTiles表示_作業レポート.md](05_ポリゴン表示/docs/土地活用推進調査_PMTiles表示_作業レポート.md) — 土地活用 PMTiles 表示の詳細レポート
- [05_ポリゴン表示/gdal-full/README.md](05_ポリゴン表示/gdal-full/README.md) — GDAL ビルド・データ変換の詳細
