// components/checkout/DeliveryMapPicker.tsx
"use client";

import { useEffect, useRef, useState } from "react";

type DeliveryMapPickerProps = {
  onSelect: (payload: { address: string; lat: number; lng: number }) => void;
  initialCenter?: { lat: number; lng: number };
};

type SelectedLocation = {
  address: string;
  lat: number;
  lng: number;
};

type LatLngLiteral = {
  lat: number;
  lng: number;
};

export function DeliveryMapPicker({
  onSelect,
  initialCenter = { lat: 0.3476, lng: 32.5825 },
}: DeliveryMapPickerProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const geocoderRef = useRef<any>(null);
  const autocompleteRef = useRef<any>(null);

  const [searchValue, setSearchValue] = useState("");
  const [selectedLocation, setSelectedLocation] =
    useState<SelectedLocation | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function getGoogleMaps() {
    if (typeof window === "undefined") {
      return null;
    }

    return (window as any).google?.maps || null;
  }

  function moveMarker(position: LatLngLiteral) {
    if (!markerRef.current) {
      return;
    }

    if (typeof markerRef.current.setPosition === "function") {
      markerRef.current.setPosition(position);
    } else {
      markerRef.current.position = position;
    }
  }

  function selectLocation(location: SelectedLocation) {
    setSelectedLocation(location);
    setSearchValue(location.address);
    setError(null);

    const position: LatLngLiteral = {
      lat: location.lat,
      lng: location.lng,
    };

    mapInstanceRef.current?.panTo(position);
    mapInstanceRef.current?.setZoom(17);
    moveMarker(position);

    onSelect(location);
  }

  async function reverseGeocode(position: LatLngLiteral) {
    if (!geocoderRef.current) {
      return "Selected location";
    }

    try {
      const response = await geocoderRef.current.geocode({
        location: position,
      });

      return response.results?.[0]?.formatted_address || "Selected location";
    } catch {
      return "Selected location";
    }
  }

  async function handleMapPoint(position: LatLngLiteral) {
    setIsResolving(true);
    setError(null);

    try {
      moveMarker(position);

      const address = await reverseGeocode(position);

      selectLocation({
        address,
        lat: position.lat,
        lng: position.lng,
      });
    } finally {
      setIsResolving(false);
    }
  }

 function handleAutocompleteSelection() {
  const autocomplete = autocompleteRef.current;

  if (!autocomplete || typeof autocomplete.getPlace !== "function") {
    setError("Autocomplete is not ready yet.");
    return;
  }

  const place = autocomplete.getPlace();

  if (!place) {
    setError("No place was selected. Please choose a suggestion from the dropdown.");
    return;
  }

  const location = place.geometry?.location;

  if (!location) {
    setError("Selected place has no location. Pick another suggestion.");
    return;
  }

  const lat = Number(location.lat());
  const lng = Number(location.lng());

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    setError("Selected place returned invalid coordinates.");
    return;
  }

  selectLocation({
    address:
      place.formatted_address ||
      place.name ||
      `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
    lat,
    lng,
  });
}

  function confirmSelectedLocation() {
    if (!selectedLocation) {
      setError("Select a location from the suggestions or click the map.");
      return;
    }

    onSelect(selectedLocation);
  }

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    function waitForGoogleMaps() {
      const googleMaps = getGoogleMaps();

      if (googleMaps) {
        setIsReady(true);
        return;
      }

      timer = setTimeout(waitForGoogleMaps, 200);
    }

    waitForGoogleMaps();

    const handler = () => setIsReady(true);
    window.addEventListener("google-maps-ready", handler);

    return () => {
      if (timer) {
        clearTimeout(timer);
      }

      window.removeEventListener("google-maps-ready", handler);
    };
  }, []);

  useEffect(() => {
    if (!isReady || !mapRef.current || !inputRef.current) {
      return;
    }

    const googleMaps = getGoogleMaps();

    if (!googleMaps) {
      return;
    }

    let cancelled = false;

    async function initMap() {
      try {
        let MapClass = googleMaps.Map;
        let GeocoderClass = googleMaps.Geocoder;
        let AdvancedMarkerElement = googleMaps.marker?.AdvancedMarkerElement;
        let AutocompleteClass = googleMaps.places?.Autocomplete;

        if (typeof googleMaps.importLibrary === "function") {
          const mapsLibrary = await googleMaps.importLibrary("maps");
          const markerLibrary = await googleMaps.importLibrary("marker");
          const placesLibrary = await googleMaps.importLibrary("places");

          MapClass = mapsLibrary.Map || MapClass;
          AdvancedMarkerElement =
            markerLibrary.AdvancedMarkerElement || AdvancedMarkerElement;
          AutocompleteClass = placesLibrary.Autocomplete || AutocompleteClass;
        }

        if (cancelled || !mapRef.current || !inputRef.current) {
          return;
        }

        if (!AutocompleteClass) {
          setError(
            "Google Places autocomplete is not loaded. Check that libraries=places is in the Google Maps script.",
          );
          return;
        }

        const map = new MapClass(mapRef.current, {
          center: initialCenter,
          zoom: 15,
          mapId: process.env.NEXT_PUBLIC_GOOGLE_MAP_ID,
          disableDefaultUI: true,
          zoomControl: true,
          clickableIcons: false,
        });

        mapInstanceRef.current = map;
        geocoderRef.current = new GeocoderClass();

        if (AdvancedMarkerElement) {
          markerRef.current = new AdvancedMarkerElement({
            map,
            position: initialCenter,
            gmpDraggable: true,
            title: "Delivery location",
          });
        } else {
          markerRef.current = new googleMaps.Marker({
            map,
            position: initialCenter,
            draggable: true,
            title: "Delivery location",
          });
        }

        const autocomplete = new AutocompleteClass(inputRef.current, {
          fields: ["formatted_address", "geometry", "name"],
          componentRestrictions: {
            country: "ug",
          },
        });

        autocompleteRef.current = autocomplete;
        autocomplete.addListener("place_changed", handleAutocompleteSelection);

        map.addListener("click", async (event: any) => {
          const lat = event.latLng?.lat();
          const lng = event.latLng?.lng();

          if (lat == null || lng == null) {
            return;
          }

          await handleMapPoint({ lat, lng });
        });

        markerRef.current?.addListener?.("dragend", async () => {
          const marker = markerRef.current;

          if (!marker) {
            return;
          }

          const rawPosition =
            typeof marker.getPosition === "function"
              ? marker.getPosition()
              : marker.position;

          if (!rawPosition) {
            return;
          }

          const lat =
            typeof rawPosition.lat === "function"
              ? rawPosition.lat()
              : Number(rawPosition.lat);

          const lng =
            typeof rawPosition.lng === "function"
              ? rawPosition.lng()
              : Number(rawPosition.lng);

          if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            return;
          }

          await handleMapPoint({ lat, lng });
        });
      } catch (err) {
        console.error("Failed to initialize delivery map:", err);
        setError("Failed to initialize map autocomplete.");
      }
    }

    initMap();

    return () => {
      cancelled = true;
    };
  }, [isReady, initialCenter]);

  return (
    <div className="space-y-3">
      <div>
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Search delivery location
        </label>

        <input
          ref={inputRef}
          type="text"
          value={searchValue}
          onChange={(event) => {
            setSearchValue(event.target.value);
            setSelectedLocation(null);
            setError(null);
          }}
          placeholder="Start typing an address, area, or landmark"
          autoComplete="off"
          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div
        ref={mapRef}
        style={{ height: "380px", width: "100%" }}
        className="overflow-hidden rounded-xl border"
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          {!isReady
            ? "Loading map..."
            : isResolving
              ? "Resolving location..."
              : selectedLocation
                ? selectedLocation.address
                : "Start typing and select a suggestion, or click the map."}
        </p>

        <button
          type="button"
          onClick={confirmSelectedLocation}
          disabled={!selectedLocation || isResolving}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-100"
        >
          Use this location
        </button>
      </div>

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}
    </div>
  );
}