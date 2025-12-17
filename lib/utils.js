// Utility function for merging class names
function clsx(...inputs) {
  return inputs
    .flat()
    .filter(Boolean)
    .join(' ');
}

function cn(...inputs) {
  return window.twMerge ? window.twMerge(clsx(inputs)) : clsx(inputs);
}

// Make it globally available
window.cn = cn;