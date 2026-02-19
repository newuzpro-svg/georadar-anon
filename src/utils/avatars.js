// Generate SVG avatar based on user ID hash
export function generateAvatar(userId, size = 80) {
    const hash = hashCode(userId);
    const hue = Math.abs(hash % 360);
    const hue2 = (hue + 40) % 360;

    return `data:image/svg+xml,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:hsl(${hue},70%,50%)" />
          <stop offset="100%" style="stop-color:hsl(${hue2},70%,40%)" />
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="url(#g)" />
      <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle"
        font-family="Inter,sans-serif" font-weight="600" font-size="${size * 0.4}"
        fill="white" opacity="0.9">
        ${getInitials(userId)}
      </text>
    </svg>
  `)}`;
}

function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const chr = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0;
    }
    return hash;
}

function getInitials(userId) {
    return userId.substring(0, 2).toUpperCase();
}

// Gender icons
export const genderLabels = {
    male: '♂ Мужской',
    female: '♀ Женский',
    not_selected: '⚪ Не указан',
};
