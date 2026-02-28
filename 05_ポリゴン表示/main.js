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
  // ポップアップを表示する
  new maplibregl.Popup({
    closeButton: false, // 閉じるボタンの表示
  })
    .setLngLat(e.lngLat)
    .setHTML(name)
    .addTo(map);
});
