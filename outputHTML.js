function outputHTML(data, powMin, powMax, radius, threshold, plotNan, opacity, interpolateTheme, reverseHeatmap, latIndex, lngIndex, powIndex, noiseIndex, noiseDiff, initLat, initLng, initZoom) {
    let headTxt = function () {/*
<!DOCTYPE html>

<head>
<meta content="text/html; charset=utf-8" http-equiv="content-type"/>
<meta content="width=device-width,
                initial-scale=1.0, maximum-scale=1.0, user-scalable=no" name="viewport"/>
<script src="https://code.jquery.com/jquery-3.5.1.min.js"></script>
<!-- <script src="https://unpkg.com/d3"></script> -->
<script src="https://d3js.org/d3.v5.min.js"></script>
<script src="https://unpkg.com/d3fc@15.0.8/build/d3fc.js"></script>
<script src="https://cdn.jsdelivr.net/npm/leaflet@1.6.0/dist/leaflet.js"></script>
<link href="https://cdn.jsdelivr.net/npm/leaflet@1.6.0/dist/leaflet.css" rel="stylesheet"/>
<script> // 色変換の関数定義
//The steps in the jet colorscale
const jet_data_lin = [
    [0,0,0.5],
    [0,0,1],
    [0,0.5,1],
    [0,1,1],
    [0.5,1,0.5],
    [1,1,0],
    [1,0.5,0],
    [1,0,0],
    [0.5,0,0]
]

const jet_rgb = jet_data_lin.map(x => {
    return d3.rgb.apply(null, x.map(y=>y*255))
})

jetInterpList = new Array(jet_rgb.length-1);
for (let i=0;i<jet_rgb.length-1;i++) {
    jetInterpList[i] = d3.interpolateRgb(jet_rgb[i], jet_rgb[i+1])
}

function interpJet(pow) {
    if (!(0 <= pow && pow <= 1)) return "rgb(0, 0, 0)";

    const n = jet_rgb.length-1;

    var i = Math.max(0, Math.min(n - 1, Math.floor(pow *= n)));
    return jetInterpList[i](pow - i);
};
</script>
<script>
// 関数定義
function norm(x, min, max) { // 電力値の正規化
    if (x > max) return 1;
    if (x < min) return 0;
    return (x - min) / (max - min);
};
function getInterpolationFunc(interpolateTheme, reverseHeatmap) {
    let f = function() {};
    switch (interpolateTheme) {
        case "red-blue":
            f = d3.interpolateRdBu;
            break;

        case "red":
            f = d3.interpolateReds;
            break;

        case "blue":
            f = d3.interpolateBlues;
            break;

        case "green":
            f = d3.interpolateGreens;
            break;

        case "grey":
            f = d3.interpolateGreys;
            break;

        case "orange":
            f = d3.interpolateOranges;
            break;

        case "spectral":
            f = d3.interpolateSpectral;
            break;

        case "viridis":
            f = d3.interpolateViridis;
            break;

        case "inferno":
            f = d3.interpolateInferno;
            break;

        case "plasma":
            f = d3.interpolatePlasma;
            break;

        case "cool":
            f = d3.interpolateCool;
            break;

        case "jet":
            f = interpJet;
            break;

        default:
            f = d3.interpolateSpectral;
    }

    if (reverseHeatmap) {
        return function(x) {return f(1-x)};
    } else {
        return f;
    }
};
function cvtPow2Color(pow, min, max, interpolateTheme, reverseHeatmap) {
    return getInterpolationFunc(interpolateTheme, reverseHeatmap)(norm(pow, min, max));
};
function updateColorbar(powMin, powMax, interpolateTheme, reverseHeatmap) { // カラーバーの更新
    $("#colorbar-container").empty();

    const domain = [powMin, powMax]; // カラーバーの値のレンジ
    const height = Math.floor(38 * $(window).height()/100);
    const width = 200;
    const svgWidth = 130;

    // カラーバーの上下部にゆとりを持たせる.
    const paddedDomain = fc.extentLinear()
        .pad([0.1, 0.1])
        .padUnit("percent")(domain);
    const [min, max] = paddedDomain;
    const expandedDomain = d3.range(min, max, (max - min) / height);

    // Band scale for x-axis
    const xScale = d3
        .scaleBand()
        .domain([0, 1])
        .range([0, width]);

    // Linear scale for y-axis
    const yScale = d3
        .scaleLinear()
        .domain(paddedDomain)
        .range([height, 0]);

    const svgBar = fc
        .autoBandwidth(fc.seriesSvgBar())
        .xScale(xScale)
        .yScale(yScale)
        .crossValue(0)
        .baseValue((_, i) => (i > 0 ? expandedDomain[i - 1] : 0))
        .mainValue(d => d)
        .decorate(selection => {
        selection.selectAll("path").style("fill", d => getInterpolationFunc(interpolateTheme, reverseHeatmap)(norm(d, ...domain)));
        // selection.selectAll("path").style("fill", d => d3.interpolateSpectral(norm(d, ...domain)));
        // selection.selectAll("path").style("fill", d => console.log(d));
        });

    // Drawing the legend bar
    const legendSvg = d3.select("#colorbar-container").append("svg")
        .attr("height", height)
        .attr("width", svgWidth)
        .attr("viewBox", `0, 0, ${svgWidth}, ${height}`)
        .attr("id", "colorbar");
    const legendBar = legendSvg
        .append("g")
        .datum(expandedDomain)
        .call(svgBar);

    tickValues = [...domain,
        domain[0] + (domain[1] - domain[0]) / 5,
        domain[0] + 2*(domain[1] - domain[0]) / 5,
        domain[0] + 3*(domain[1] - domain[0]) / 5,
        domain[0] + 4*(domain[1] - domain[0]) / 5]

    // Removing the outer ticks
    const axisLabel = fc
        .axisRight(yScale)
        .tickValues(tickValues)
        .tickSizeOuter(0)
        .decorate((s) =>
            s.enter()
                .select("text")
                .style("font-size", "20"));

    // Drawing and translating the label
    const barWidth = Math.abs(legendBar.node().getBBox().x);
    legendSvg.append("g")
        .attr("transform", `translate(${barWidth})`)
        .datum(expandedDomain)
        .call(axisLabel);

    // Hiding the vertical line
    legendSvg.append("g")
        .attr("transform", `translate(${barWidth})`)
        .datum(expandedDomain)
        .call(axisLabel)
        .select(".domain")
        .attr("visibility", "hidden");

    $(window).off('resize');
    $(window).on('resize', function(){
        legendSvg.attr("height", Math.floor(38 * $(window).height()/100));
    });

}
</script>
<style>html, body {width: 100%;height: 100%;margin: 0;padding: 0;}</style>
<style>#map-container {position: relative;width: 100.0%;height: 100.0%;left: 0;top: 0;z-index: 0;}</style>
</head>
*/}.toString().split("\n").slice(1, -1).join("\n");

    let bodyTxt = function () {/*
<body>
    <div class="folium-map" id="map-container"></div>
    <div id="colorbar-container"></div>
</body>
*/}.toString().split("\n").slice(1, -1).join("\n");

    let styleTxt = function () {/*
<style>
#colorbar-container {
    opacity: 1;

    position: absolute;
    bottom: 3rem;
    left: 2vw;
    
    background-color: rgba(255, 255, 255, 0.8);
    
    padding: 2vh 0 2vh 2vw;
    border-radius: 2rem;
}

.leaflet-popup-content-wrapper {
    font-size: 1.1rem;
}
</style>
*/}.toString().split("\n").slice(1, -1).join("\n");

    declarationScript = "<script>";

    declarationScript += `const data = [\n`;
    for (let i = 0; i < data.length; i++) {
        declarationScript += "['" + data[i].join("', '") + "'],\n"
    }
    declarationScript += `];\n`;

    declarationScript += `const powMin = ${powMin};\n`;
    declarationScript += `const powMax = ${powMax};\n`;

    declarationScript += `const radius = ${radius};\n`;

    declarationScript += `const threshold = ${threshold};\n`;

    declarationScript += `const plotNan = ${plotNan};\n`;
    declarationScript += `const interpolateTheme = "${interpolateTheme}";\n`;
    declarationScript += `const reverseHeatmap = ${reverseHeatmap};\n`;

    declarationScript += `const latIndex = ${latIndex};\n`;
    declarationScript += `const lngIndex = ${lngIndex};\n`;
    declarationScript += `const powIndex = ${powIndex};\n`;

    declarationScript += `const noiseIndex = ${noiseIndex};\n`;
    declarationScript += `const noiseDiff = ${noiseDiff};\n`;

    declarationScript += `const initPos = [${initLat}, ${initLng}];\n`;
    declarationScript += `const initZoom = ${initZoom};\n`;
    declarationScript += `const initOpacity = ${opacity};\n`;
    declarationScript += "</script>";

    let mainScript = function () {/*
<script>

// マップインスタンス生成
let map = L.map(
    "map-container",
    {
        center: initPos,
        crs: L.CRS.EPSG3857,
        zoom: initZoom,
        zoomControl: true,
        preferCanvas: false,
    }
);

// 縮尺の表示
L.control.scale({
    imperial: true,
    metric: true
}).addTo(map);

// タイルレイヤーの追加とレイヤーコントローラの追加
let baseLayers = {};
let overLayers = getTilesDict(initOpacity);
let layersControl = L.control.layers(baseLayers, overLayers).addTo(map);

// ズームコントローラの追加
map.zoomControl.setPosition("bottomright");

// 初期位置ボタンの挙動追加
$('#reset-pos-button').off("click");
$('#reset-pos-button').on("click", function() {
    resetPos(...initPos);
    return false;
});

// タイルの取得
function getTilesDict(opacity) {
    return {
        "国土地理院:淡色地図": L.tileLayer("https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png", {
            "attribution": "<a href='http://maps.gsi.go.jp/development/ichiran.html'>地理院タイル</a>",
            "detectRetina": false, "maxNativeZoom": 18, "maxZoom": 18, "minZoom": 0, "noWrap": false, "opacity": opacity, "subdomains": "abc", "tms": false
        }),
        "国土地理院:標準地図": L.tileLayer("https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png", {
            "attribution": "<a href='http://maps.gsi.go.jp/development/ichiran.html'>地理院タイル</a>",
            "opacity": opacity
        }),
        "国土地理院:白地図": L.tileLayer("https://cyberjapandata.gsi.go.jp/xyz/blank/{z}/{x}/{y}.png", {
            "attribution": "<a href='http://maps.gsi.go.jp/development/ichiran.html'>地理院タイル</a>",
            "maxNativeZoom": 14, "maxZoom": 14, "minZoom": 6, "opacity": opacity
        }),
        "国土地理院:色別標高図": L.tileLayer("https://cyberjapandata.gsi.go.jp/xyz/relief/{z}/{x}/{y}.png", {
            "attribution": "<a href='http://maps.gsi.go.jp/development/ichiran.html'>地理院タイル. 海域部は海上保安庁海洋情報部の資料を使用して作成.</a>",
            "maxNativeZoom": 15, "maxZoom": 15, "minZoom": 6, "opacity": opacity
        }),
        "国土地理院:写真": L.tileLayer("https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg", {
            "attribution": "<a href='http://maps.gsi.go.jp/development/ichiran.html'>地理院タイル</a><br>データソース：Landsat8画像（GSI,TSIC,GEO Grid/AIST）, Landsat8画像（courtesy of the U.S. Geological Survey）, 海底地形（GEBCO）",
            "maxNativeZoom": 18, "maxZoom": 18, "minZoom": 9, "opacity": opacity
        }),
        "国土地理院:陰影起伏図": L.tileLayer("https://cyberjapandata.gsi.go.jp/xyz/hillshademap/{z}/{x}/{y}.png", {
            "attribution": "<a href='http://maps.gsi.go.jp/development/ichiran.html'>地理院タイル</a>",
            "maxNativeZoom": 16, "maxZoom": 16, "minZoom": 6, "opacity": opacity
        }),
        "OSM": L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            "attribution": "&copy; <a href='http://osm.org/copyright'>OpenStreetMap</a> contributors",
            "detectRetina": false, "maxNativeZoom": 18, "maxZoom": 18, "minZoom": 0, "noWrap": false, "opacity": opacity, "subdomains": "abc", "tms": false
        }),
        "OSM-Toner": L.tileLayer("https://stamen-tiles-{s}.a.ssl.fastly.net/toner/{z}/{x}/{y}.png", {
            "attribution": "Map tiles by \u003ca href=\"http://stamen.com\"\u003eStamen Design\u003c/a\u003e, under \u003ca href=\"http://creativecommons.org/licenses/by/3.0\"\u003eCC BY 3.0\u003c/a\u003e. Data by \u0026copy; \u003ca href=\"http://openstreetmap.org\"\u003eOpenStreetMap\u003c/a\u003e, under \u003ca href=\"http://www.openstreetmap.org/copyright\"\u003eODbL\u003c/a\u003e.",
            "detectRetina": false, "maxNativeZoom": 18, "maxZoom": 18, "minZoom": 0, "noWrap": false, "opacity": opacity, "subdomains": "abc", "tms": false
        })
    }
}

// タイルの更新
function updateTiles(opacity) {
    // 描画中のタイルレイヤーの削除
    for (let key in overLayers) {
        if (map.hasLayer(overLayers[key])) map.removeLayer(overLayers[key]);
    }

    // レイヤーコントローラーの削除と更新
    layersControl.remove();
    overLayers = getTilesDict(opacity);
    layersControl = L.control.layers(baseLayers, overLayers).addTo(map);
}

// 円のプロットのための関数
function plotAllCircles(data, latIndex, lngIndex, powIndex, powMin, powMax, threshold, plotNan, radius, interpolateTheme, reverseHeatmap, noiseIndex, noiseDiff) {
    for (let i=1; i<data.length; i++) {
        if (data[i].length < 3) {
            continue;
        }

        // 点を描画するかどうかのチェック
        if (data[i][powIndex] < threshold) { // thresholdによるチェック (ちなみにthreshold is NaN なら Falseになる)
            continue;
        } else if ( !plotNan && isNaN(data[i][powIndex]) ) {
            continue;
        } else if ( !plotNan && (data[i][powIndex].length==0) ) {
            continue;
        }

        const lat = parseFloat(data[i][latIndex]);
        const lng = parseFloat(data[i][lngIndex]);
        const pow = parseFloat(data[i][powIndex]);

        // ノイズとの差のチェック, index=-1の時, チェックしない.
        if (noiseIndex >= 0) {
            const noise = parseFloat(data[i][noiseIndex]);
            if ((pow - noise) < noiseDiff) {
                continue;
            }
        }

        const color = cvtPow2Color(pow, powMin, powMax, interpolateTheme, reverseHeatmap);

        c = L.circle(
                [lat, lng],
                {"bubblingMouseEvents": true, "color": color, "dashArray": null, "dashOffset": null, "fill": true, "fillColor": color, "fillOpacity": 1, "fillRule": "evenodd", "lineCap": "round", "lineJoin": "round", "opacity": 1, "radius": radius, "stroke": true, "weight": 1}
            ).addTo(map);

        c.bindPopup(`緯度 : ${lat}<br>経度 : ${lng}<br>値 : ${pow}`);
        c.on("mouseover", function(e) {
            this.openPopup();
        });
        c.on("mouseout", function(e) {
            this.closePopup();
        });
    }
};

function resetPos(lat, lng) {
    map.setView([lat, lng]);
}


plotAllCircles(data, latIndex, lngIndex, powIndex, powMin, powMax, threshold, plotNan, radius, interpolateTheme, reverseHeatmap, noiseIndex, noiseDiff);
updateColorbar(powMin, powMax, interpolateTheme, reverseHeatmap);
</script>
*/}.toString().split("\n").slice(1, -1).join("\n");

    // let blob = new Blob(["hoge"], { type: "text/html" });
    let blob = new Blob([headTxt + bodyTxt + styleTxt + declarationScript + mainScript], { type: "text/html" });
    let link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'copy.html';
    link.click();
}