// components/checkout/DeliveryMapPicker.tsx
"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    google: typeof google;
  }
}

type DeliveryMapPickerProps = {
  onSelect: (payload: { address: string; lat: number; lng: number }) => void;
  initialCenter?: { lat: number; lng: number };
};

export function DeliveryMapPicker({
  onSelect,
  initialCenter = { lat: 0.3476, lng: 32.5825 },
}: DeliveryMapPickerProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Step 1: wait for Google Maps script to load
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (window.google?.maps) {
      setIsReady(true);
      return;
    }

    const handler = () => setIsReady(true);
    window.addEventListener("google-maps-ready", handler);
    return () => window.removeEventListener("google-maps-ready", handler);
  }, []);

  // Step 2: initialize map only after script is ready
  useEffect(() => {
    if (!isReady || !mapRef.current || !inputRef.current) return;

    let cancelled = false;

    async function init() {
      if (cancelled || !mapRef.current || !inputRef.current) return;

      const { Map } = (await google.maps.importLibrary(
        "maps",
      )) as google.maps.MapsLibrary;

      const { AdvancedMarkerElement } = (await google.maps.importLibrary(
        "marker",
      )) as google.maps.MarkerLibrary;

      const { Autocomplete } = (await google.maps.importLibrary(
        "places",
      )) as google.maps.PlacesLibrary;

      if (cancelled || !mapRef.current || !inputRef.current) return;

      const map = new Map(mapRef.current, {
        center: initialCenter,
        zoom: 15,
        mapId: process.env.NEXT_PUBLIC_GOOGLE_MAP_ID,
        disableDefaultUI: true,
        zoomControl: true,
        clickableIcons: false,
      });

      const marker = new AdvancedMarkerElement({
        map,
        position: initialCenter,
        gmpDraggable: true,
        title: "Delivery location",
      });

      const geocoder = new google.maps.Geocoder();

      const autocomplete = new Autocomplete(inputRef.current, {
        fields: ["formatted_address", "geometry", "name"],
        componentRestrictions: { country: "ug" },
        types: ["geocode"],
      });

      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        const lat = place.geometry?.location?.lat?.();
        const lng = place.geometry?.location?.lng?.();
        const address = place.formatted_address || place.name || "";
        if (!address || lat == null || lng == null) return;

        const pos = { lat, lng };
        map.panTo(pos);
        map.setZoom(17);
        marker.position = pos;
        onSelect({ address, lat, lng });
      });

      map.addListener("click", async (e: google.maps.MapMouseEvent) => {
        const lat = e.latLng?.lat();
        const lng = e.latLng?.lng();
        if (lat == null || lng == null) return;

        marker.position = { lat, lng };
        try {
          const res = await geocoder.geocode({ location: { lat, lng } });
          const address =
            res.results?.[0]?.formatted_address || "Selected location";
          if (inputRef.current) inputRef.current.value = address;
          onSelect({ address, lat, lng });
        } catch {
          onSelect({ address: "Selected location", lat, lng });
        }
      });

      marker.addListener("dragend", async () => {
        const pos = marker.position as google.maps.LatLngLiteral | null;
        if (!pos) return;
        try {
          const res = await geocoder.geocode({ location: pos });
          const address =
            res.results?.[0]?.formatted_address || "Selected location";
          if (inputRef.current) inputRef.current.value = address;
          onSelect({ address, lat: pos.lat, lng: pos.lng });
        } catch {
          onSelect({
            address: "Selected location",
            lat: pos.lat,
            lng: pos.lng,
          });
        }
      });
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [isReady, initialCenter, onSelect]);

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="text"
        placeholder="Search delivery address"
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
      />
      <div
        ref={mapRef}
        style={{ height: "380px", width: "100%" }}
        className="overflow-hidden rounded-xl border"
      />
      <p className="text-xs text-muted-foreground">
        Search, click the map, or drag the pin to the exact delivery point.
      </p>
    </div>
  );
}