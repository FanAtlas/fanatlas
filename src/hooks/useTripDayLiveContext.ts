import { useEffect, useMemo, useRef, useState } from "react";
import type { Language } from "../i18n";
import type { TripDayExperience } from "../lib/tripDay";
import type { MapDestination } from "../mapDestinations";
import { isOffline } from "../lib/connectivity";
import {
  buildTripDayCurrencyRequest,
  buildTripDayLiveContextIdentity,
  buildTripDayLiveContextKey,
  buildTripDayOfficialUpdatesRequest,
  buildTripDayWeatherRequest,
  hasTripDayRouteDestination,
  resolveTripDayRouteDestination,
  type TripDayCurrencyContextResult,
  type TripDayLiveContextStatus,
  type TripDayOfficialUpdatesContextResult,
  type TripDayRouteContext,
  type TripDayWeatherContextResult
} from "../lib/tripDayLiveContext";
import { sendTripDayLiveContextRequest } from "../lib/tripDayLiveContextClient";
import type { TripDayOfficialUpdatesCategory } from "../lib/tripDayLiveContext";

type LiveCardState<T> = {
  status: TripDayLiveContextStatus;
  result: T | null;
  error: string;
  requestKey: string | null;
};

function createInitialState<T>(): LiveCardState<T> {
  return {
    status: "idle",
    result: null,
    error: "",
    requestKey: null
  };
}

export function useTripDayLiveContext(input: {
  experience: TripDayExperience;
  destination: {
    label: string;
    city?: string;
    country?: string;
    countryCode?: string;
    latitude?: number;
    longitude?: number;
    currency?: string;
    timezone?: string;
  } | null;
  language: Language;
  routeDestination: MapDestination | null;
  baseCurrency: string;
  amount: number;
  onOpenMapDestination: (destination: MapDestination | null) => void;
  onSetTab: (tab: "map") => void;
}) {
  const identity = useMemo(() => buildTripDayLiveContextIdentity(input.experience), [input.experience]);
  const requestKey = useMemo(() => buildTripDayLiveContextKey(identity), [identity]);
  const resolvedRouteDestination = useMemo(
    () => resolveTripDayRouteDestination({ experience: input.experience, selectedMapDestination: input.routeDestination }),
    [input.experience, input.routeDestination]
  );
  const weatherAbortRef = useRef<AbortController | null>(null);
  const currencyAbortRef = useRef<AbortController | null>(null);
  const officialAbortRef = useRef<AbortController | null>(null);
  const requestKeyRef = useRef(requestKey);

  const [weather, setWeather] = useState<LiveCardState<TripDayWeatherContextResult>>(createInitialState<TripDayWeatherContextResult>());
  const [currency, setCurrency] = useState<LiveCardState<TripDayCurrencyContextResult>>(createInitialState<TripDayCurrencyContextResult>());
  const [officialUpdates, setOfficialUpdates] = useState<LiveCardState<TripDayOfficialUpdatesContextResult>>(createInitialState<TripDayOfficialUpdatesContextResult>());
  const [route, setRoute] = useState<TripDayRouteContext>(() => ({
    status: resolvedRouteDestination ? "success" : "unavailable",
    destination: resolvedRouteDestination,
    unavailableReason: resolvedRouteDestination ? undefined : "route_unavailable"
  }));

  useEffect(() => {
    if (requestKeyRef.current === requestKey) return;
    requestKeyRef.current = requestKey;
    weatherAbortRef.current?.abort();
    currencyAbortRef.current?.abort();
    officialAbortRef.current?.abort();
    setWeather(createInitialState<TripDayWeatherContextResult>());
    setCurrency(createInitialState<TripDayCurrencyContextResult>());
    setOfficialUpdates(createInitialState<TripDayOfficialUpdatesContextResult>());
  }, [input.routeDestination, requestKey]);

  useEffect(() => {
    setRoute({
      status: resolvedRouteDestination ? "success" : "unavailable",
      destination: resolvedRouteDestination,
      unavailableReason: resolvedRouteDestination ? undefined : "route_unavailable"
    });
  }, [resolvedRouteDestination]);

  async function checkWeather() {
    const request = buildTripDayWeatherRequest({
      experience: input.experience,
      destination: input.destination,
      locale: input.language,
      units: "metric"
    });
    if (!request) {
      setWeather({
        status: "unavailable",
        result: null,
        error: "",
        requestKey,
      });
      return;
    }

    if (isOffline()) {
      setWeather({
        status: "unavailable",
        result: null,
        error: "",
        requestKey
      });
      return;
    }

    const controller = new AbortController();
    weatherAbortRef.current?.abort();
    weatherAbortRef.current = controller;
    setWeather({ status: "loading", result: null, error: "", requestKey });

    try {
      const response = await sendTripDayLiveContextRequest(request, { signal: controller.signal });
      if (requestKeyRef.current !== requestKey) return;
      setWeather({
        status: response.status === "success" || response.status === "partial" ? response.status : "unavailable",
        result: response,
        error: "",
        requestKey
      });
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
      if (requestKeyRef.current !== requestKey) return;
      setWeather({
        status: "error",
        result: null,
        error: String((error as { message?: string }).message || "tripDayLiveContext.error.failed"),
        requestKey
      });
    }
  }

  async function checkCurrency() {
    const request = buildTripDayCurrencyRequest({
      experience: input.experience,
      baseCurrency: input.baseCurrency,
      targetCurrency: input.destination?.currency || "EUR",
      amount: input.amount,
      locale: input.language
    });
    if (!request) {
      setCurrency({
        status: "unavailable",
        result: null,
        error: "",
        requestKey
      });
      return;
    }

    if (isOffline()) {
      setCurrency({
        status: "unavailable",
        result: null,
        error: "",
        requestKey
      });
      return;
    }

    const controller = new AbortController();
    currencyAbortRef.current?.abort();
    currencyAbortRef.current = controller;
    setCurrency({ status: "loading", result: null, error: "", requestKey });

    try {
      const response = await sendTripDayLiveContextRequest(request, { signal: controller.signal });
      if (requestKeyRef.current !== requestKey) return;
      setCurrency({
        status: response.status === "success" || response.status === "partial" ? response.status : "unavailable",
        result: response,
        error: "",
        requestKey
      });
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
      if (requestKeyRef.current !== requestKey) return;
      setCurrency({
        status: "error",
        result: null,
        error: String((error as { message?: string }).message || "tripDayLiveContext.error.failed"),
        requestKey
      });
    }
  }

  async function checkOfficialUpdates(categories: readonly TripDayOfficialUpdatesCategory[] = ["advisory", "transport", "tourism"]) {
    const request = buildTripDayOfficialUpdatesRequest({
      experience: input.experience,
      destination: input.destination,
      locale: input.language,
      categories
    });
    if (!request) {
      setOfficialUpdates({
        status: "unavailable",
        result: null,
        error: "",
        requestKey
      });
      return;
    }

    if (isOffline()) {
      setOfficialUpdates({
        status: "unavailable",
        result: null,
        error: "",
        requestKey
      });
      return;
    }

    const controller = new AbortController();
    officialAbortRef.current?.abort();
    officialAbortRef.current = controller;
    setOfficialUpdates({ status: "loading", result: null, error: "", requestKey });

    try {
      const response = await sendTripDayLiveContextRequest(request, { signal: controller.signal });
      if (requestKeyRef.current !== requestKey) return;
      setOfficialUpdates({
        status: response.status === "success" || response.status === "partial" ? response.status : "unavailable",
        result: response,
        error: "",
        requestKey
      });
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
      if (requestKeyRef.current !== requestKey) return;
      setOfficialUpdates({
        status: "error",
        result: null,
        error: String((error as { message?: string }).message || "tripDayLiveContext.error.failed"),
        requestKey
      });
    }
  }

  function openMap() {
    input.onOpenMapDestination(route.destination);
    input.onSetTab("map");
  }

  return {
    identity,
    requestKey,
    weather,
    currency,
    officialUpdates,
    route,
    checkWeather,
    checkCurrency,
    checkOfficialUpdates,
    openMap,
    hasRouteDestination: hasTripDayRouteDestination({ experience: input.experience }),
    routeDestination: route.destination
  };
}
