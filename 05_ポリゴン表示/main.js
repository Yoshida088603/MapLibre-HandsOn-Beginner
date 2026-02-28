// PMTiles プロトコルを登録（Range リクエスト用）。metadata: true でソースの minzoom/maxzoom を取得
let protocol = new pmtiles.Protocol({ metadata: true });
maplibregl.addProtocol('pmtiles', protocol.tile);

// 庭園路ポリゴン（PMTiles）の bounds: 135.34,34.58 - 135.60,34.77（神戸・大阪付近）。初期視点をここに合わせると青いポリゴンが表示される。
// 工業用地（GeoJSON）は東京付近 [139.7, 35.66] にあり、地図を東へパンすると見える。
var map = new maplibregl.Map({
  container: 'map',
  style: 'https://tile.openstreetmap.jp/styles/osm-bright-ja/style.json', // 地図のスタイル
  center: [135.47, 34.68], // 庭園路 PMTiles の中心（神戸・大阪付近）
  zoom: 12, // minzoom=0, maxzoom=15 の範囲内
});

// 背景スタイル（osm-bright-ja）で参照される POI アイコンが不足している場合の警告を抑える
map.on('styleimagemissing', (e) => {
  var id = e.id;
  if (!map.hasImage(id)) {
    map.addImage(id, { width: 1, height: 1, data: new Uint8Array([0, 0, 0, 0]) });
  }
});

// ポリゴンデータを表示する
map.on('load', () => {
  // 既存: GeoJSON（工業用地）
  map.addSource('industrial_area', {
    type: 'geojson',
    data: './data/polygon.geojson',
  });
  map.addLayer({
    id: 'industrial_area',
    type: 'fill',
    source: 'industrial_area',
    layout: {},
    paint: {
      'fill-color': '#FD7E00',
      'fill-opacity': 0.8,
    },
  });

  // PMTiles（庭園路ポリゴン）。絶対 URL で Range リクエストを有効にする
  var pmtilesBaseUrl = location.origin + location.pathname.replace(/\/[^/]*$/, '') + '/gdal-full/output_data/庭園路ポリゴン.pmtiles';
  if (typeof console !== 'undefined' && console.debug) console.debug('PMTiles URL:', pmtilesBaseUrl, 'source-layer: 庭園路ポリゴン');
  map.addSource('pmtiles_tunnel', {
    type: 'vector',
    url: 'pmtiles://' + pmtilesBaseUrl,
  });
  // source-layer: GDAL 出力 PMTiles のレイヤ名（ogrinfo -al -so xxx.pmtiles で確認）
  // ポリゴン・マルチポリゴンのみ表示（ベクタタイルのジオメトリ種別を明示）
  map.addLayer({
    id: 'pmtiles_tunnel_fill',
    type: 'fill',
    source: 'pmtiles_tunnel',
    'source-layer': '庭園路ポリゴン',
    filter: ['in', ['geometry-type'], ['literal', ['Polygon', 'MultiPolygon']]],
    paint: {
      'fill-color': '#3388ff',
      'fill-opacity': 0.7,
      'fill-outline-color': '#0066cc',
    },
  });

  // PMTiles（管理三角点・点）。bounds: 129.07,32.80 - 129.92,32.83（長崎付近）。地図を西へパンすると見える。
  var takakutenPmtilesUrl = location.origin + location.pathname.replace(/\/[^/]*$/, '') + '/gdal-full/output_data/kanri_takakuten_pt.pmtiles';
  map.addSource('pmtiles_takakuten', {
    type: 'vector',
    url: 'pmtiles://' + takakutenPmtilesUrl,
  });
  map.addLayer({
    id: 'pmtiles_takakuten_circle',
    type: 'circle',
    source: 'pmtiles_takakuten',
    'source-layer': 'kanri_takakuten_pt',
    paint: {
      'circle-radius': 6,
      'circle-color': '#e74c3c',
      'circle-stroke-width': 1,
      'circle-stroke-color': '#c0392b',
    },
  });

  // PMTiles（14条地図・ポリゴン）。bounds: 127.66,26.19 - 145.61,44.37（全国）、約7906件
  var jyuchizuPmtilesUrl = location.origin + location.pathname.replace(/\/[^/]*$/, '') + '/gdal-full/output_data/14条地図.pmtiles';
  map.addSource('pmtiles_jyuchizu', {
    type: 'vector',
    url: 'pmtiles://' + jyuchizuPmtilesUrl,
  });
  map.addLayer({
    id: 'pmtiles_jyuchizu_fill',
    type: 'fill',
    source: 'pmtiles_jyuchizu',
    'source-layer': '14条地図',
    filter: ['in', ['geometry-type'], ['literal', ['Polygon', 'MultiPolygon']]],
    paint: {
      'fill-color': '#27ae60',
      'fill-opacity': 0.5,
      'fill-outline-color': '#1e8449',
    },
  });

  // デバッグ: ソースのロード成否をコンソールで確認
  map.on('error', (e) => console.error('MapLibre error:', e));
  map.on('sourcedata', (e) => {
    if (e.sourceId === 'pmtiles_tunnel' && e.sourceDataType === 'metadata') {
      console.log('PMTiles source metadata loaded');
    }
    if (e.sourceId === 'pmtiles_tunnel' && e.isSourceLoaded) {
      console.log('PMTiles source fully loaded');
    }
  });
});

// 地物クリック時にポップアップを表示する
map.on('click', 'industrial_area', (e) => {
  var name = e.features[0].properties.L05_002;
  new maplibregl.Popup({
    closeButton: false,
  })
    .setLngLat(e.lngLat)
    .setHTML(name)
    .addTo(map);
});

// 管理三角点クリック時: 座標と属性をポップアップ表示（タイルに含まれる全プロパティを表示）
var takakutenLabel = {
  meisyo: '名称', syozaiti: '所在地', kijyunten_cd: '基準点コード', sokuryo_nengappi: '測量年月日',
  x: '座標系X', y: '座標系Y', b: '緯度b', l: '経度l', jibandaka: '楕円体高', antenna_daka: 'アンテナ高',
  id: 'ID', haiten: '配点', sikutyo_cd: '測地系コード', sikutyo: '測地系', syubetu_cd: '種別コード',
  zahyokei_cd: '座標系コード', sokutikei_cd: '測地系コード2', hosei_x: '補正X', hosei_y: '補正Y',
  hyoko: '標高', hosei_hyoko: '補正標高', geoid: 'ジオイド', syukusyaku_keisu: '縮尺係数', n: 'n',
  zaisitu_cd: '在処コード', sokutei_housiki_cd: '測定方式コード', genkyo_timoku_cd: '現況科目コード',
  antenna_iti_cd: 'アンテナ位置コード', setti_cd: '設置コード', yobi: '予備',
};
map.on('click', 'pmtiles_takakuten_circle', (e) => {
  var lng = e.lngLat.lng.toFixed(6);
  var lat = e.lngLat.lat.toFixed(6);
  var p = e.features[0].properties;
  var fmt = (v) => (v != null && v !== '') ? String(v) : '—';
  var rows = [];
  Object.keys(p).forEach(function (k) {
    if (k === 'mvt_id') return;
    var label = takakutenLabel[k] || k;
    rows.push([label, fmt(p[k])]);
  });
  var table = rows.length
    ? rows.map(function (r) { return '<tr><th>' + r[0] + '</th><td>' + r[1] + '</td></tr>'; }).join('')
    : '<tr><td colspan="2">属性なし</td></tr>';
  var html = '<div class="popup-takakuten">' +
    '<p><strong>座標</strong> 経度 ' + lng + ' / 緯度 ' + lat + '</p>' +
    '<table><tbody>' + table + '</tbody></table>' +
    '</div>';
  new maplibregl.Popup({ closeButton: true })
    .setLngLat(e.lngLat)
    .setHTML(html)
    .addTo(map);
});

// 14条地図ポリゴンクリック時: 14条完了エリアとして ID・AREA をポップアップ表示
map.on('click', 'pmtiles_jyuchizu_fill', (e) => {
  var p = e.features[0].properties;
  var fmt = (v) => (v != null && v !== '') ? String(v) : '—';
  var html = '<div class="popup-takakuten">' +
    '<p class="popup-title">14条完了エリア</p>' +
    '<p><strong>座標</strong> 経度 ' + e.lngLat.lng.toFixed(6) + ' / 緯度 ' + e.lngLat.lat.toFixed(6) + '</p>' +
    '<table><tbody>' +
    '<tr><th>ID</th><td>' + fmt(p.ID) + '</td></tr>' +
    '<tr><th>AREA</th><td>' + fmt(p.AREA) + '</td></tr>' +
    '</tbody></table></div>';
  new maplibregl.Popup({ closeButton: true })
    .setLngLat(e.lngLat)
    .setHTML(html)
    .addTo(map);
});
