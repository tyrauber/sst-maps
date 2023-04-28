import Head from 'next/head'
import Script from 'next/script'
import 'maplibre-gl/dist/maplibre-gl.css';
import 'maplibre-gl-inspect/dist/maplibre-gl-inspect.css';
import styles from '@/styles/Map.module.css'
import { useEffect, useRef, useState } from 'react'

import maplibregl from 'maplibre-gl';
import * as pmtiles from "pmtiles";
import * as protomaps_themes_base from "protomaps-themes-base";
import MaplibreInspect from 'maplibre-gl-inspect';

interface QuerySourceFeaturesOptions {
    sourceLayer: string;
    filter?: any[];
    validate?: boolean;
}

const Map = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<maplibregl.Map | null>(null);
    const [lng] = useState(-157.218);
    const [lat] = useState(20.462);
    const [zoom] = useState(7);

    useEffect(() => {
        if (map.current || !mapContainer.current) return;

        let protocol = new pmtiles.Protocol();
        maplibregl.addProtocol("pmtiles", protocol.tile);
        let URL = process.env.CDN_URL || `${window.location.protocol}//${window.location.hostname}`;
        const style = protomaps_themes_base.default("protomaps","light")
        map.current = new maplibregl.Map({
            container: mapContainer.current,
            hash: "map",
            style: {
                glyphs:'https://cdn.protomaps.com/fonts/pbf/{fontstack}/{range}.pbf',
                version: 8,
                sources: {
                    "protomaps": {
                        maxzoom: 15,
                        type: "vector",
                        tiles: [URL+`/v1/tiles/${process.env.DEFAULT_TILES}/{z}/{x}/{y}.mvt`],
                        attribution: 'Protomaps © <a href="https://openstreetmap.org">OpenStreetMap</a>'
                    },
                    "osm_poi_points":{
                        type: 'vector',
                        tiles: [ URL +`/v1/postgis/mvt/osm_poi_points/{z}/{x}/{y}.pbf?columns=tags`],
                        minzoom: 9,
                        maxzoom: 14
                    },
                    "osm_trails":{
                        type: 'vector',
                        //tiles: [ URL +`/v1/postgis/geojson/osm_trails?bounds={z},{x},{y}&columns=tags`],
                        tiles: [ URL +`/v1/postgis/mvt/osm_trails/{z}/{x}/{y}.pbf?columns=tags`],
                        minzoom: 9,
                        maxzoom: 14
                    },

                },
                layers: [
                    ...style,
                    {
                        id: 'osm_poi_points',
                        type: 'circle',
                        'source': 'osm_poi_points',
                        'source-layer': 'osm_poi_points',
                        paint: {
                            'circle-radius': 4,
                            'circle-color': "#fff",
                            'circle-stroke-color': "#aaa",
                            'circle-stroke-width': 1,
                        },
                        'circle-color': 'Red',
                    },
                    {
                        id: 'osm_trails',
                        'source': 'osm_trails',
                        'source-layer': 'osm_trails',
                        type: 'line',
                        layout: {
                            'line-cap': "round",
                            'line-join': "round"
                        },
                        paint: {
                            'line-color': "#6084eb",
                            'line-width': 2,
                            'line-dasharray': [1, 2],
                        }
                    }
                ]
            },
            center: [lng, lat],
            zoom: zoom,
        });

        map.current.addControl(new maplibregl.NavigationControl({
            showCompass: true, // show compass control
            showZoom: true // show zoom control
        }));

        //https://github.com/acalcutt/maplibre-gl-inspect
        map.current.addControl(new MaplibreInspect({
            queryParameters: {
                layers: ['osm_poi_points', 'osm_trails']
            },
            showMapPopup: true,
            showInspectMapPopup: true,
            showInspectButton: false,
            showMapPopupOnHover: false,
            showInspectMapPopupOnHover: false,
            renderPopup: function (features:any) {
                var result = '';
                for (const feature of features) {
                    result += `<h3>${feature.sourceLayer}</h3>`
                    result += `<table class="popup" className="popup">`
                    for (const key of Object.keys(feature.properties).sort().reverse()) {
                        result += `<tr><td>${key}</td><td>${feature.properties[key]}</td></tr>`;
                    }
                    result += '</table>';
                }
                return result;
            },
        }));
    });

    return (
        <div className={styles.mapWrap}>
            <div ref={mapContainer} className={styles.map} />
        </div>
    );
}

export default function Home() {
    return (
        <>
            <main >
                <Map></Map>
            </main>
        </>
    )
}
