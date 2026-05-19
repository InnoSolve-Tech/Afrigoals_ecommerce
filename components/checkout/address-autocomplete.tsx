// components/checkout/address-autocomplete.tsx
"use client";

import { useEffect, useRef, useState } from "react";

interface AddressAutocompleteProps {
  onSelect: (payload: { address: string; lat: number; lng: number }) => void;
  placeholder?: string;
  defaultValue?: string;
  disabled?: boolean;
}

export function AddressAutocomplete({
  onSelect,
  placeholder = "Enter delivery address",
  defaultValue = "",
  disabled = false,
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);

  function getGoogleMaps() {
    if (typeof window === "undefined") {
      return null;
    }

    return (window as any).google?.maps || null;
  }

  useEffect(() => {
    if (disabled) {
      return;
    }

    let listener: any;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    function initAutocomplete() {
      if (cancelled) {
        return;
      }

      const googleMaps = getGoogleMaps();

      if (!googleMaps || !inputRef.current) {
        timer = setTimeout(initAutocomplete, 200);
        return;
      }

      if (!googleMaps.places?.Autocomplete) {
        setError("Google Places autocomplete is not loaded.");
        return;
      }

      const autocomplete = new googleMaps.places.Autocomplete(
        inputRef.current,
        {
          fields: ["formatted_address", "geometry", "name"],
          componentRestrictions: {
            country: "ug",
          },
          types: ["geocode"],
        },
      );

      autocompleteRef.current = autocomplete;

      listener = autocomplete.addListener("place_changed", () => {
        try {
          const place = autocomplete.getPlace();

          if (!place) {
            setError("No place was selected. Choose a suggestion.");
            return;
          }

          const location = place.geometry?.location;

          if (!location) {
            setError("Selected place has no location. Choose another option.");
            return;
          }

          const lat = Number(location.lat());
          const lng = Number(location.lng());

          if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            setError("Selected place returned invalid coordinates.");
            return;
          }

          const address =
            place.formatted_address ||
            place.name ||
            `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

          if (!address) {
            setError("Selected place has no address.");
            return;
          }

          setError(null);

          onSelect({
            address,
            lat,
            lng,
          });
        } catch (err) {
          console.error("Address autocomplete failed:", err);
          setError("Failed to read selected address. Try another suggestion.");
        }
      });
    }

    initAutocomplete();

    return () => {
      cancelled = true;

      if (timer) {
        clearTimeout(timer);
      }

      const googleMaps = getGoogleMaps();

      if (listener && googleMaps?.event?.removeListener) {
        googleMaps.event.removeListener(listener);
      }
    };
  }, [disabled, onSelect]);

  return (
    <div className="space-y-1">
      <input
        ref={inputRef}
        type="text"
        defaultValue={defaultValue}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      />

      {error ? (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      ) : null}
    </div>
  );
}