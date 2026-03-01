# 05_ポリゴン表示

## サーバー起動

PMTiles 表示には **Content-Length** と **HTTP Range** 対応が必要なため、通常の `python3 -m http.server` では動作しません。

**必ず `serve.py` を使って起動してください。**

```bash
cd MapLibre-HandsOn-Beginner/05_ポリゴン表示
python3 serve.py
```

起動後、ブラウザで **http://localhost:8080/** を開いて地図を表示します。

## 土地活用推進調査の位置がずれている場合

プロットが道路ではなく海・山・建物上に出る場合は、CSV の座標列（8・9列目）の X/Y 解釈が逆の可能性があります。  
`gdal-full/scripts/csv_to_geoparquet_tochi.py` で 8列目→y, 9列目→x に変更済みです。位置を直すには以下を **順に** やり直してください。

いずれも **`05_ポリゴン表示/gdal-full` をカレント** にして実行します。  
（すでに `gdal-full` にいる場合は `cd` は不要。`./scripts/...` は実行権がないと失敗するので **`bash scripts/...`** を使うこと。）

```bash
# カレントを gdal-full にする（場所に応じてどれか）
cd 05_ポリゴン表示/gdal-full
# または cd MapLibre-HandsOn-Beginner/05_ポリゴン表示/gdal-full

source env.sh

# 1) 変換済み GPKG を削除（土地活用のみ）
rm -f "inputfile/20260219昨年納品DVD/05ホームページ公開用データ及びプログラム/データ_geopackage_converted/土地活用推進調査/"*.gpkg

# 2) CSV → GPKG 再変換
bash scripts/csv_to_geopackage.sh

# 3) マージ
python3 scripts/merge_tochi_geopackage.py

# 4) PMTiles 作成
bash scripts/gpkg_to_pmtiles.sh
```

5. ブラウザで地図を再読み込み
