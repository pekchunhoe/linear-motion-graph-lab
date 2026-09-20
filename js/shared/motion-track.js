const EPSILON = 1e-9;

export function originVisible(range) {
  return Array.isArray(range) && range.length === 2
    && range.every(Number.isFinite) && range[0] <= 0 && range[1] >= 0 && range[1] > range[0];
}

export function createTrackMapping(range, width, carWidth) {
  if (!Array.isArray(range) || range.length !== 2 || !range.every(Number.isFinite) || range[1] <= range[0]) {
    throw new Error('A motion track needs a finite increasing position range.');
  }
  const padding = Math.max(0, carWidth / 2 + 5);
  const usableWidth = Math.max(0, width - 2 * padding);
  return {
    padding,
    originVisible: originVisible(range),
    positionToPixel: position => padding + (position - range[0]) / (range[1] - range[0]) * usableWidth
  };
}

function numberLabel(value) {
  return String(Number(value.toFixed(2)));
}

export function mountTrackMarkers(container, range, ticks = []) {
  container.replaceChildren();
  const { visible, ordinaryTicks } = trackMarkerData(range, ticks);
  const markers = ordinaryTicks.map(position => {
    const marker = document.createElement('span');
    marker.className = 'mark'; marker.dataset.position = position;
    marker.textContent = numberLabel(position);
    container.append(marker);
    return marker;
  });
  let origin = null;
  if (visible) {
    origin = document.createElement('span');
    origin.className = 'origin-marker'; origin.dataset.position = '0';
    origin.title = 'Origin, s = 0'; origin.setAttribute('aria-label', 'Origin, s equals zero');
    const word = document.createElement('span'); word.className = 'origin-word'; word.textContent = 'Origin';
    const value = document.createElement('span'); value.className = 'origin-value'; value.textContent = 's = 0';
    origin.append(word, value); container.append(origin);
  }
  return { markers, origin, originVisible: visible };
}

export function trackMarkerData(range, ticks = []) {
  const visible = originVisible(range);
  return {
    visible,
    ordinaryTicks: [...new Set(ticks.filter(Number.isFinite).filter(value => value >= range[0] && value <= range[1]))]
      .filter(value => !visible || Math.abs(value) > EPSILON)
  };
}

export function layoutTrack({ road, car, range, position, markers, origin }) {
  const carWidth = car.getBoundingClientRect().width;
  const mapping = createTrackMapping(range, road.clientWidth, carWidth);
  car.style.left = `${mapping.positionToPixel(position)}px`;
  markers.forEach(marker => {
    marker.style.left = `${mapping.positionToPixel(Number(marker.dataset.position))}px`;
    marker.classList.remove('origin-neighbor'); marker.removeAttribute('aria-hidden');
  });
  if (origin) {
    const originX = mapping.positionToPixel(0);
    origin.style.left = `${originX}px`;
    // Retain the tick line, but suppress a nearby ordinary label that would make
    // the named origin unreadable on a compact road.
    const labelDistance = road.clientWidth < 600 ? 38 : 48;
    markers.filter(marker => Math.abs(mapping.positionToPixel(Number(marker.dataset.position)) - originX) < labelDistance)
      .forEach(marker => { marker.classList.add('origin-neighbor'); marker.setAttribute('aria-hidden', 'true'); });
  }
  return mapping;
}

export function originSummary(position, visible) {
  if (!visible) return 'The origin is outside this visible track range.';
  if (Math.abs(position) < EPSILON) return 'Origin at s = 0 is marked on the track. The car is at the origin.';
  const side = position < 0 ? 'left' : 'right';
  return `Origin at s = 0 is marked on the track. The car is ${Math.abs(position).toFixed(2)} m to the ${side} of the origin.`;
}
