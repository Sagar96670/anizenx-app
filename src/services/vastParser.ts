/**
 * VAST (Video Ad Serving Template) 2.0 / 3.0 / 4.0 XML Parser & Fetcher
 * Dynamically resolves VAST XML endpoints (e.g. vapid-size.com, HilltopAds, Monetag, Google Ad Manager)
 * and extracts direct MediaFile MP4 video URLs, clickthroughs, tracking events, durations & skip offsets.
 */

export interface VastMediaFile {
  url: string;
  type: string;
  bitrate?: number;
  width?: number;
  height?: number;
  delivery?: string;
}

export interface VastParsedAd {
  isVast: boolean;
  mediaUrl: string;
  mediaType: 'video' | 'image';
  title?: string;
  description?: string;
  durationSec?: number;
  skipDelaySec?: number;
  clickThroughUrl?: string;
  clickTrackingUrls?: string[];
  impressionUrls?: string[];
  errorUrls?: string[];
  trackingEvents?: Record<string, string[]>;
  rawXml?: string;
}

/**
 * Quick heuristic to check if a string looks like a VAST URL or XML payload
 */
export function isLikelyVast(urlOrContent: string): boolean {
  if (!urlOrContent) return false;
  const trimmed = urlOrContent.trim();
  if (trimmed.startsWith('<') && (trimmed.includes('<VAST') || trimmed.includes('<Ad') || trimmed.includes('<?xml'))) {
    return true;
  }
  const lower = urlOrContent.toLowerCase();
  if (
    lower.includes('vapid-size.com') ||
    lower.includes('vast') ||
    lower.includes('format=vast') ||
    lower.includes('response=xml') ||
    lower.includes('.xml')
  ) {
    return true;
  }
  return false;
}

/**
 * Helper to get clean text content from an XML node, handling CDATA and whitespace
 */
function getNodeText(node: Element | null | undefined): string {
  if (!node) return '';
  let content = node.textContent || '';
  content = content.replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, '').trim();
  return content;
}

/**
 * Helper to extract all matching child elements by tag name regardless of namespace
 */
function getElementsByTagNameAnyNs(root: Element | Document, tagName: string): Element[] {
  const list: Element[] = [];
  const lowerTag = tagName.toLowerCase();
  const all = root.getElementsByTagName('*');
  for (let i = 0; i < all.length; i++) {
    const el = all[i];
    const local = el.localName || el.nodeName.split(':').pop() || '';
    if (local.toLowerCase() === lowerTag) {
      list.push(el);
    }
  }
  return list;
}

/**
 * Helper to get first child matching tag name regardless of namespace
 */
function getFirstElementByTagNameAnyNs(root: Element | Document, tagName: string): Element | null {
  const elements = getElementsByTagNameAnyNs(root, tagName);
  return elements.length > 0 ? elements[0] : null;
}

/**
 * Parse VAST duration string "HH:MM:SS" or "HH:MM:SS.mmm" or integer seconds
 */
export function parseVastDuration(durationStr: string): number | undefined {
  if (!durationStr) return undefined;
  const cleaned = durationStr.trim();
  const parts = cleaned.split(':');
  if (parts.length === 3) {
    const hours = parseFloat(parts[0]) || 0;
    const mins = parseFloat(parts[1]) || 0;
    const secs = parseFloat(parts[2]) || 0;
    const total = hours * 3600 + mins * 60 + secs;
    if (total > 0 && total <= 300) {
      return Math.round(total);
    }
  }
  const num = parseFloat(cleaned);
  if (!isNaN(num) && num > 0) return Math.round(num);
  return undefined;
}

/**
 * Parse VAST 3.0 skipoffset attribute (e.g. "00:00:05", "00:00:05.000", "5", "15%")
 */
export function parseVastSkipOffset(skipOffsetStr: string | null | undefined, adDurationSec?: number): number | undefined {
  if (!skipOffsetStr) return undefined;
  const str = skipOffsetStr.trim();
  if (str.endsWith('%') && adDurationSec && adDurationSec > 0) {
    const pct = parseFloat(str.replace('%', ''));
    if (!isNaN(pct) && pct > 0) {
      return Math.max(1, Math.round((pct / 100) * adDurationSec));
    }
  }
  return parseVastDuration(str);
}

/**
 * Fetch raw XML from a URL with automatic CORS proxy fallback
 */
async function fetchXmlString(url: string): Promise<string> {
  // Attempt 1: Direct fetch
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/xml, text/xml, */*',
      },
    });
    if (res.ok) {
      const text = await res.text();
      if (text && (text.includes('<VAST') || text.includes('<?xml') || text.includes('<Ad'))) {
        return text;
      }
    }
  } catch {
    // Direct fetch failed (likely CORS)
  }

  // Attempt 2: Server-side proxy /api/proxy
  try {
    const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
    const proxyRes = await fetch(proxyUrl);
    if (proxyRes.ok) {
      const proxyText = await proxyRes.text();
      if (proxyText && (proxyText.includes('<VAST') || proxyText.includes('<?xml') || proxyText.includes('<Ad'))) {
        return proxyText;
      }
    }
  } catch (err) {
    console.warn('[VAST] Server proxy fetch error:', err);
  }

  throw new Error(`Unable to fetch VAST XML from: ${url}`);
}

/**
 * Parses a VAST 2.0 / 3.0 / 4.0 XML Document into a VastParsedAd object
 */
export function parseVastXmlDocument(xmlText: string): VastParsedAd | null {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
      console.warn('[VAST 3.0] XML parsing error in payload:', parserError.textContent);
      return null;
    }

    const vastNode = getFirstElementByTagNameAnyNs(xmlDoc, 'VAST');
    if (!vastNode) {
      return null;
    }

    // Collect Impression URLs
    const impressionUrls: string[] = [];
    const impressionNodes = getElementsByTagNameAnyNs(xmlDoc, 'Impression');
    impressionNodes.forEach((node) => {
      const text = getNodeText(node);
      if (text && text.startsWith('http')) {
        impressionUrls.push(text);
      }
    });

    // Collect Error tracking URLs
    const errorUrls: string[] = [];
    const errorNodes = getElementsByTagNameAnyNs(xmlDoc, 'Error');
    errorNodes.forEach((node) => {
      const text = getNodeText(node);
      if (text && text.startsWith('http')) {
        errorUrls.push(text);
      }
    });

    // Title & Description
    const titleNode = getFirstElementByTagNameAnyNs(xmlDoc, 'AdTitle');
    const title = titleNode ? getNodeText(titleNode) : undefined;

    const descNode = getFirstElementByTagNameAnyNs(xmlDoc, 'Description');
    const description = descNode ? getNodeText(descNode) : undefined;

    // Linear element & VAST 3.0 skipoffset
    const linearNode = getFirstElementByTagNameAnyNs(xmlDoc, 'Linear');
    const skipOffsetAttr = linearNode?.getAttribute('skipoffset');

    // Duration
    const durationNode = getFirstElementByTagNameAnyNs(xmlDoc, 'Duration');
    const durationSec = durationNode ? parseVastDuration(getNodeText(durationNode)) : undefined;

    // Calculate skip delay from VAST 3.0 skipoffset or default
    const skipDelaySec = parseVastSkipOffset(skipOffsetAttr, durationSec);

    // ClickThrough & ClickTracking
    const clickThroughNode = getFirstElementByTagNameAnyNs(xmlDoc, 'ClickThrough');
    const clickThroughUrl = clickThroughNode ? getNodeText(clickThroughNode) : undefined;

    const clickTrackingUrls: string[] = [];
    const clickTrackingNodes = getElementsByTagNameAnyNs(xmlDoc, 'ClickTracking');
    clickTrackingNodes.forEach((node) => {
      const text = getNodeText(node);
      if (text && text.startsWith('http')) {
        clickTrackingUrls.push(text);
      }
    });

    // Tracking Events (start, firstQuartile, midpoint, thirdQuartile, complete, skip, pause, resume, etc.)
    const trackingEvents: Record<string, string[]> = {};
    const trackingNodes = getElementsByTagNameAnyNs(xmlDoc, 'Tracking');
    trackingNodes.forEach((node) => {
      const eventName = node.getAttribute('event');
      const text = getNodeText(node);
      if (eventName && text && text.startsWith('http')) {
        if (!trackingEvents[eventName]) trackingEvents[eventName] = [];
        trackingEvents[eventName].push(text);
      }
    });

    // Media Files extraction (VAST 3.0 / 4.0 MediaFiles)
    const mediaFileNodes = getElementsByTagNameAnyNs(xmlDoc, 'MediaFile');
    const candidateFiles: VastMediaFile[] = [];

    mediaFileNodes.forEach((node) => {
      const rawUrl = getNodeText(node);
      if (rawUrl && rawUrl.startsWith('http')) {
        const type = (node.getAttribute('type') || 'video/mp4').toLowerCase();
        const bitrate = parseInt(node.getAttribute('bitrate') || '0', 10) || undefined;
        const width = parseInt(node.getAttribute('width') || '0', 10) || undefined;
        const height = parseInt(node.getAttribute('height') || '0', 10) || undefined;
        const delivery = (node.getAttribute('delivery') || 'progressive').toLowerCase();

        candidateFiles.push({
          url: rawUrl,
          type,
          bitrate,
          width,
          height,
          delivery,
        });
      }
    });

    // Pick best MediaFile (prioritize MP4 video, progressive, high resolution)
    let chosenMediaUrl = '';
    if (candidateFiles.length > 0) {
      // 1. Prioritize MP4 progressive streams
      const mp4Files = candidateFiles.filter(
        (f) => f.type.includes('mp4') || f.url.toLowerCase().includes('.mp4')
      );
      if (mp4Files.length > 0) {
        // Sort by width/resolution or bitrate descending
        mp4Files.sort((a, b) => (b.width || 0) - (a.width || 0) || (b.bitrate || 0) - (a.bitrate || 0));
        chosenMediaUrl = mp4Files[0].url;
      } else {
        // 2. WebM fallback
        const webmFiles = candidateFiles.filter(
          (f) => f.type.includes('webm') || f.url.toLowerCase().includes('.webm')
        );
        if (webmFiles.length > 0) {
          webmFiles.sort((a, b) => (b.width || 0) - (a.width || 0));
          chosenMediaUrl = webmFiles[0].url;
        } else {
          // 3. Fallback to first available media file
          chosenMediaUrl = candidateFiles[0].url;
        }
      }
    }

    return {
      isVast: true,
      mediaUrl: chosenMediaUrl,
      mediaType: 'video',
      title: title || undefined,
      description: description || undefined,
      durationSec,
      skipDelaySec,
      clickThroughUrl: clickThroughUrl || undefined,
      clickTrackingUrls: clickTrackingUrls.length > 0 ? clickTrackingUrls : undefined,
      impressionUrls: impressionUrls.length > 0 ? impressionUrls : undefined,
      errorUrls: errorUrls.length > 0 ? errorUrls : undefined,
      trackingEvents: Object.keys(trackingEvents).length > 0 ? trackingEvents : undefined,
      rawXml: xmlText,
    };
  } catch (err) {
    console.error('[VAST 3.0] Error parsing XML document:', err);
    return null;
  }
}

/**
 * Recursively resolves a VAST tag URL or XML string to extract the playable MP4 stream,
 * unwrapping nested VAST 3.0 Wrappers up to maxDepth.
 */
export async function resolveVastTag(
  urlOrXml: string,
  maxDepth = 4,
  accumulatedImpressions: string[] = [],
  accumulatedClickTracking: string[] = [],
  accumulatedErrorUrls: string[] = [],
  accumulatedTrackingEvents: Record<string, string[]> = {}
): Promise<VastParsedAd | null> {
  if (!urlOrXml || maxDepth <= 0) return null;

  try {
    let xmlText = urlOrXml.trim();

    // If input is a URL rather than raw XML string
    if (xmlText.startsWith('http://') || xmlText.startsWith('https://')) {
      xmlText = await fetchXmlString(xmlText);
    }

    const parsed = parseVastXmlDocument(xmlText);
    if (!parsed) return null;

    // Check if this was a wrapper with an inner VAST URI
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');
    const wrapperUriNode = getFirstElementByTagNameAnyNs(doc, 'VASTAdTagURI');
    const wrapperUri = wrapperUriNode ? getNodeText(wrapperUriNode) : '';

    const allImpressions = [...accumulatedImpressions, ...(parsed.impressionUrls || [])];
    const allClickTracking = [...accumulatedClickTracking, ...(parsed.clickTrackingUrls || [])];
    const allErrorUrls = [...accumulatedErrorUrls, ...(parsed.errorUrls || [])];

    const mergedTrackingEvents: Record<string, string[]> = { ...accumulatedTrackingEvents };
    if (parsed.trackingEvents) {
      Object.entries(parsed.trackingEvents).forEach(([event, urls]) => {
        if (!mergedTrackingEvents[event]) mergedTrackingEvents[event] = [];
        mergedTrackingEvents[event] = [...mergedTrackingEvents[event], ...urls];
      });
    }

    if (wrapperUri && wrapperUri.startsWith('http') && (!parsed.mediaUrl || parsed.mediaUrl.length === 0)) {
      // Resolve wrapper recursively
      const childResult = await resolveVastTag(
        wrapperUri,
        maxDepth - 1,
        allImpressions,
        allClickTracking,
        allErrorUrls,
        mergedTrackingEvents
      );
      if (childResult && childResult.mediaUrl) {
        return {
          ...childResult,
          title: childResult.title || parsed.title,
          description: childResult.description || parsed.description,
          clickThroughUrl: childResult.clickThroughUrl || parsed.clickThroughUrl,
          durationSec: childResult.durationSec || parsed.durationSec,
          skipDelaySec: childResult.skipDelaySec ?? parsed.skipDelaySec,
          impressionUrls: [...allImpressions, ...(childResult.impressionUrls || [])],
          clickTrackingUrls: [...allClickTracking, ...(childResult.clickTrackingUrls || [])],
          errorUrls: [...allErrorUrls, ...(childResult.errorUrls || [])],
          trackingEvents: { ...mergedTrackingEvents, ...(childResult.trackingEvents || {}) },
        };
      }
    }

    return {
      ...parsed,
      impressionUrls: allImpressions.length > 0 ? allImpressions : undefined,
      clickTrackingUrls: allClickTracking.length > 0 ? allClickTracking : undefined,
      errorUrls: allErrorUrls.length > 0 ? allErrorUrls : undefined,
      trackingEvents: Object.keys(mergedTrackingEvents).length > 0 ? mergedTrackingEvents : undefined,
    };
  } catch (err) {
    console.warn('[VAST 3.0] Failed to resolve VAST tag:', err);
    return null;
  }
}

/**
 * Fires tracking and impression beacons silently without blocking UI
 */
export function fireTrackingBeacons(urls?: string[]) {
  if (!urls || urls.length === 0) return;
  urls.forEach((url) => {
    if (!url || !url.startsWith('http')) return;
    try {
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        navigator.sendBeacon(url);
      } else {
        const img = new Image();
        img.src = url;
      }
    } catch {
      // Fallback fetch
      fetch(url, { mode: 'no-cors' }).catch(() => {});
    }
  });
}
