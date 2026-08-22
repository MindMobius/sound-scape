import assetCatalog from "../../../../assets/catalog.json";
import derivativesCatalog from "../../../../assets/derivatives.json";
import soundLibrary from "../../../../assets/audio/sound-library.v1.json";
import sceneIndex from "../../../../assets/scenes/index.json";
import playableCatalog from "../../../../assets/scenes/playable-scenes.v1.json";

const sceneManifestModules = import.meta.glob("../../../../assets/scenes/*/scene.json", {
  eager: true,
  import: "default",
});
const sceneRasterModules = import.meta.glob("../../../../assets/scenes/**/*-web-v1.jpg", {
  eager: true,
  import: "default",
  query: "?url",
});
const audioModules = import.meta.glob("../../../../assets/audio/*.{mp3,wav,ogg,flac,m4a}", {
  eager: true,
  import: "default",
  query: "?url",
});

function repositoryPath(modulePath) {
  const markerIndex = modulePath.lastIndexOf("assets/");
  if (markerIndex < 0) throw new Error(`资源不在仓库 assets 目录中：${modulePath}`);
  return modulePath.slice(markerIndex);
}

function mapModulesByRepositoryPath(modules) {
  return new Map(
    Object.entries(modules).map(([modulePath, value]) => [repositoryPath(modulePath), value]),
  );
}

function required(map, key, label) {
  const value = map.get(key);
  if (value === undefined) throw new Error(`${label} 未登记：${key}`);
  return value;
}

const manifestsByPath = mapModulesByRepositoryPath(sceneManifestModules);
const rasterUrlByPath = mapModulesByRepositoryPath(sceneRasterModules);
const audioUrlByPath = mapModulesByRepositoryPath(audioModules);
const assetById = new Map(assetCatalog.assets.map((asset) => [asset.id, asset]));
const derivativeBySourceId = new Map(
  derivativesCatalog.derivatives.map((derivative) => [derivative.sourceAssetId, derivative]),
);
const audioAssetById = new Map(soundLibrary.assets.map((asset) => [asset.id, asset]));
const playableBySceneId = new Map(
  playableCatalog.scenes.map((playable) => [playable.sceneId, playable]),
);
const sceneManifests = sceneIndex.scenes.map((entry) =>
  required(manifestsByPath, entry.manifest, "场景清单"),
);

function resolveSceneVisual(scene, slotName) {
  const sourceAssetId = scene.slots?.[slotName]?.assetId;
  const sourceAsset = required(assetById, sourceAssetId, `${scene.id} ${slotName} 母版`);
  const derivative = required(
    derivativeBySourceId,
    sourceAsset.id,
    `${scene.id} ${slotName} Web 衍生图`,
  );
  return {
    sourceAsset,
    url: required(rasterUrlByPath, derivative.path, `${scene.id} ${slotName} 文件`),
  };
}

function resolveAudioAsset(assetId) {
  const asset = required(audioAssetById, assetId, "声音素材");
  const preview = asset.segments.find((segment) => segment.id === asset.previewSegmentId);
  if (!preview) throw new Error(`${asset.id} 缺少试听片段 ${asset.previewSegmentId}`);
  return {
    asset,
    url: required(audioUrlByPath, preview.path, `${asset.id} 音频文件`),
  };
}

function makeBaseLayer(scene, audioAsset) {
  return {
    id: `${scene.id}-base`,
    name: audioAsset.asset.name["zh-CN"] ?? audioAsset.asset.name.en,
    detail: "内置声音 · 实时调音",
    catalogId: audioAsset.asset.id,
    level: 100,
    muted: false,
    source: "base",
    profile: "natural",
  };
}

const scenes = sceneManifests
  .filter((scene) => playableBySceneId.has(scene.id))
  .map((scene) => {
    const playable = required(playableBySceneId, scene.id, "可播放场景");
    const hero = resolveSceneVisual(scene, "hero");
    const cover = resolveSceneVisual(scene, "cover");
    const audioAsset = resolveAudioAsset(playable.previewAudioAssetId);
    return {
      id: scene.id,
      name: scene.name,
      description: scene.description,
      theme: hero.sourceAsset.theme,
      hero: hero.url,
      cover: cover.url,
      audio: audioAsset.url,
      elements: playable.recipe.layers.map((layer) => layer.name).slice(0, 3),
      palette: playable.palette,
      recipe: playable.recipe,
      layers: [makeBaseLayer(scene, audioAsset)],
    };
  });

const sceneById = new Map(scenes.map((scene) => [scene.id, scene]));
const templates = sceneManifests
  .filter((scene) => !playableBySceneId.has(scene.id))
  .map((scene) => ({
    id: scene.id,
    name: scene.name,
    prompt: scene.prompt,
    elements: scene.audioLayers.slice(0, 3),
    cover: resolveSceneVisual(scene, "cover").url,
  }));

const sourceIconByCategory = {
  water: "waves",
  weather: "cloud-rain",
};
const sourceCatalog = {
  environment: soundLibrary.assets.map((asset) => ({
    id: asset.id,
    name: asset.name["zh-CN"] ?? asset.name.en,
    detail: "内置声音 · 连续环境",
    icon: sourceIconByCategory[asset.category] ?? "audio-lines",
    audio: resolveAudioAsset(asset.id).url,
    profile: "natural",
  })),
  event: [
    {
      id: "event-near",
      name: "偶尔靠近",
      detail: "添加一段会被放在近处的音频",
      icon: "audio-lines",
      upload: true,
      profile: "natural",
    },
    {
      id: "event-far",
      name: "远处回应",
      detail: "添加一段带空间距离的音频",
      icon: "audio-lines",
      upload: true,
      profile: "spatial",
    },
  ],
  media: [
    {
      id: "media-radio",
      name: "老式收音机",
      detail: "窄频、单声道与轻微底噪",
      icon: "radio",
      upload: true,
      profile: "radio",
    },
    {
      id: "media-television",
      name: "雪花电视",
      detail: "颗粒底噪与突出的中频",
      icon: "tv",
      upload: true,
      profile: "television",
    },
    {
      id: "media-speaker",
      name: "单声道喇叭",
      detail: "集中声像与轻微压缩",
      icon: "speaker",
      upload: true,
      profile: "speaker",
    },
    {
      id: "media-tube",
      name: "胆机音箱",
      detail: "柔和低频与偶次染色",
      icon: "speaker",
      upload: true,
      profile: "tube",
    },
    {
      id: "media-hifi",
      name: "Hi-Fi 音响",
      detail: "更开阔的声场与细节",
      icon: "speaker",
      upload: true,
      profile: "hifi",
    },
    {
      id: "media-spatial",
      name: "耳机空间",
      detail: "双声道空间化与远近",
      icon: "headphones",
      upload: true,
      profile: "spatial",
    },
  ],
};

export { sceneById, scenes, sourceCatalog, templates };
