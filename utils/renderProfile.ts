export type GraphicsQualityLevel = 'high' | 'medium' | 'low';

export interface RenderProfile {
  quality: GraphicsQualityLevel;
  dpr: [number, number];
  shadowMapSize: number;
  shadowMapType: 'soft' | 'basic';
  shadowUpdateInterval: number;
  allowContactShadows: boolean;
  contactShadowResolution: number;
  contactShadowBlur: number;
  environmentIntensityScale: number;
  environmentBlur: number;
  allowStars: boolean;
  starCount: number;
  allowTwinklingStars: boolean;
  twinklingStarCount: number;
  allowMilkyWay: boolean;
  allowDust: boolean;
  dustParticleCount: number;
  plagueParticleCount: number;
  plagueIntensityScale: number;
  allowFauna: boolean;
  enhancedSurfaceShaders: boolean;
  npcDetailScale: number;
  allowInteriorWindowLights: boolean;
  allowInteriorRoomGlow: boolean;
  allowInteriorShadowLights: boolean;
  interiorLightScale: number;
}

const OUTDOOR_PROFILES: Record<GraphicsQualityLevel, RenderProfile> = {
  high: {
    quality: 'high',
    dpr: [1, 1.55],
    shadowMapSize: 768,
    shadowMapType: 'soft',
    shadowUpdateInterval: 0.1,
    allowContactShadows: true,
    contactShadowResolution: 512,
    contactShadowBlur: 2.25,
    environmentIntensityScale: 1,
    environmentBlur: 0.55,
    allowStars: true,
    starCount: 1000,
    allowTwinklingStars: true,
    twinklingStarCount: 280,
    allowMilkyWay: false,
    allowDust: true,
    dustParticleCount: 110,
    plagueParticleCount: 22,
    plagueIntensityScale: 1,
    allowFauna: true,
    enhancedSurfaceShaders: true,
    npcDetailScale: 1,
    allowInteriorWindowLights: true,
    allowInteriorRoomGlow: true,
    allowInteriorShadowLights: true,
    interiorLightScale: 1,
  },
  medium: {
    quality: 'medium',
    dpr: [1, 1.28],
    shadowMapSize: 512,
    shadowMapType: 'soft',
    shadowUpdateInterval: 0.16,
    allowContactShadows: false,
    contactShadowResolution: 256,
    contactShadowBlur: 2.8,
    environmentIntensityScale: 0.94,
    environmentBlur: 0.35,
    allowStars: true,
    starCount: 650,
    allowTwinklingStars: false,
    twinklingStarCount: 0,
    allowMilkyWay: false,
    allowDust: true,
    dustParticleCount: 72,
    plagueParticleCount: 16,
    plagueIntensityScale: 0.88,
    allowFauna: true,
    enhancedSurfaceShaders: false,
    npcDetailScale: 0.84,
    allowInteriorWindowLights: true,
    allowInteriorRoomGlow: true,
    allowInteriorShadowLights: false,
    interiorLightScale: 0.88,
  },
  low: {
    quality: 'low',
    dpr: [1, 1.08],
    shadowMapSize: 256,
    shadowMapType: 'basic',
    shadowUpdateInterval: 0.24,
    allowContactShadows: false,
    contactShadowResolution: 256,
    contactShadowBlur: 3.2,
    environmentIntensityScale: 0.88,
    environmentBlur: 0.18,
    allowStars: true,
    starCount: 360,
    allowTwinklingStars: false,
    twinklingStarCount: 0,
    allowMilkyWay: false,
    allowDust: true,
    dustParticleCount: 44,
    plagueParticleCount: 10,
    plagueIntensityScale: 0.74,
    allowFauna: false,
    enhancedSurfaceShaders: false,
    npcDetailScale: 0.68,
    allowInteriorWindowLights: false,
    allowInteriorRoomGlow: false,
    allowInteriorShadowLights: false,
    interiorLightScale: 0.74,
  },
};

export function resolveGraphicsQuality(
  fps: number | null,
  performanceDegraded: boolean
): GraphicsQualityLevel {
  if (fps === null || Number.isNaN(fps)) {
    return performanceDegraded ? 'medium' : 'high';
  }

  if (fps < 30) return 'low';
  if (fps < 44) return 'medium';
  return performanceDegraded && fps < 52 ? 'medium' : 'high';
}

export function getRenderProfile(
  quality: GraphicsQualityLevel,
  sceneMode: 'outdoor' | 'interior',
  playerIllnessSeverity = 0
): RenderProfile {
  const base = OUTDOOR_PROFILES[quality];
  const illnessBoost = playerIllnessSeverity > 0.45 ? 1.08 : playerIllnessSeverity > 0.15 ? 1.03 : 1;

  if (sceneMode === 'interior') {
    return {
      ...base,
      dpr: [base.dpr[0], Math.min(1.65, base.dpr[1] + 0.08)],
      allowDust: false,
      starCount: 0,
      allowStars: false,
      allowTwinklingStars: false,
      allowMilkyWay: false,
      plagueIntensityScale: base.plagueIntensityScale * illnessBoost,
      environmentBlur: Math.max(0.12, base.environmentBlur * 0.8),
    };
  }

  return {
    ...base,
    plagueIntensityScale: base.plagueIntensityScale * illnessBoost,
  };
}
