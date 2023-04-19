import Head from 'next/head'
import styles from '@/styles/Map.module.css'
import { useEffect, useRef, useState } from 'react'

import maplibregl from 'maplibre-gl';
import * as pmtiles from "pmtiles";
import * as protomaps_themes_base from "protomaps-themes-base";

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
        let URL = `${window.location.protocol}//${window.location.hostname}/v1/tiles/${process.env.DEFAULT_TILES}`
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
                    tiles: [URL+"/{z}/{x}/{y}.mvt"],
                    attribution: 'Protomaps © <a href="https://openstreetmap.org">OpenStreetMap</a>'
                }
                },
                layers: protomaps_themes_base.default("protomaps","light")
            },
            center: [lng, lat],
            zoom: zoom,
            // transformRequest: (url, resourceType) => ({
            //     url: url,
            //     headers: (resourceType === 'Source' && url.startsWith(apiHost)) ? { 'Authorization': 'Bearer ' + token } : {}
            // })
        });
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
