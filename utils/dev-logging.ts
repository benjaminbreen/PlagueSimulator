/**
 * Development logging utilities for tracking environment rendering
 * Only active when devSettings are enabled
 */

// Check if we're in development mode
const isDev = typeof process !== 'undefined' && process.env?.NODE_ENV === 'development';

/**
 * Log a message only in development mode
 */
export const devLog = (tag: string, ...args: unknown[]) => {
  if (isDev) {
    console.log(`[${tag}]`, ...args);
  }
};

/**
 * Log a warning only in development mode
 */
export const devWarn = (tag: string, ...args: unknown[]) => {
  if (isDev) {
    console.warn(`[${tag}]`, ...args);
  }
};

/**
 * Log an error (always logs, but prefixed consistently)
 */
export const devError = (tag: string, ...args: unknown[]) => {
  console.error(`[${tag}]`, ...args);
};

export interface RenderStats {
  district: string;
  renderer: string;
  objectCount: number;
  timestamp: number;
}

const renderStats: RenderStats[] = [];

export const logRender = (district: string, renderer: string, objectCount: number) => {
  const stat: RenderStats = {
    district,
    renderer,
    objectCount,
    timestamp: Date.now()
  };

  renderStats.push(stat);

  // Keep only last 100 renders
  if (renderStats.length > 100) {
    renderStats.shift();
  }

  console.log(`[ENV-RENDER] ${renderer} for ${district}: ${objectCount} objects`);
};

export const getRenderStats = (): RenderStats[] => {
  return [...renderStats];
};

export const clearRenderStats = () => {
  renderStats.length = 0;
};

export const printRenderSummary = () => {
  const summary = renderStats.reduce((acc, stat) => {
    const key = `${stat.district}-${stat.renderer}`;
    if (!acc[key]) {
      acc[key] = { count: 0, totalObjects: 0 };
    }
    acc[key].count++;
    acc[key].totalObjects += stat.objectCount;
    return acc;
  }, {} as Record<string, { count: number; totalObjects: number }>);

  console.log('\n=== Environment Render Summary ===');
  Object.entries(summary).forEach(([key, data]) => {
    console.log(`${key}: ${data.count} renders, avg ${Math.round(data.totalObjects / data.count)} objects`);
  });
  console.log('==================================\n');
};
