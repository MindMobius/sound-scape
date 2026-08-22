part of 'soundscape_player_surface.dart';

class _ListeningControls extends StatelessWidget {
  const _ListeningControls({required this.snapshot, required this.controller});

  final SoundscapeSnapshot snapshot;
  final SoundscapeController controller;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final favorite = snapshot.favoriteSceneIds.contains(snapshot.scene.id);
    return ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 430),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  snapshot.scene.name,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.headlineLarge,
                ),
              ),
              const SizedBox(width: 12),
              IconButton(
                key: ValueKey('favorite-scene-${snapshot.scene.id}'),
                tooltip: favorite ? '取消收藏' : '收藏这一处',
                onPressed: () => controller.setSceneFavorite(
                  snapshot.scene.id,
                  favorite: !favorite,
                ),
                icon: Icon(
                  favorite
                      ? Icons.favorite_rounded
                      : Icons.favorite_border_rounded,
                  size: 22,
                  color: favorite ? theme.colorScheme.secondary : null,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            snapshot.scene.description,
            style: theme.textTheme.bodyLarge?.copyWith(
              color: theme.textTheme.bodySmall?.color,
              height: 1.75,
            ),
          ),
          const SizedBox(height: 28),
          _PresetSelector(snapshot: snapshot, controller: controller),
          const SizedBox(height: 24),
          _FeelingSlider(
            leading: '轻',
            trailing: '重',
            value: snapshot.intensity,
            onChanged: controller.setIntensity,
          ),
          const SizedBox(height: 12),
          _FeelingSlider(
            leading: '简',
            trailing: '繁',
            value: snapshot.richness,
            onChanged: controller.setRichness,
          ),
        ],
      ),
    );
  }
}

class _PresetSelector extends StatelessWidget {
  const _PresetSelector({required this.snapshot, required this.controller});

  final SoundscapeSnapshot snapshot;
  final SoundscapeController controller;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final dark = theme.brightness == Brightness.dark;
    final selectedBackground = dark
        ? SoundscapeColors.darkActiveSoft
        : SoundscapeColors.activeSoft;
    return Container(
      padding: const EdgeInsets.all(3),
      decoration: BoxDecoration(
        color: dark ? SoundscapeColors.darkMuted : SoundscapeColors.muted,
        borderRadius: BorderRadius.circular(7),
      ),
      child: Row(
        children: [
          for (final preset in SoundscapeCatalog.presets)
            Expanded(
              child: Semantics(
                selected: snapshot.selectedPresetId == preset.id,
                button: true,
                child: InkWell(
                  onTap: () => controller.applyPreset(preset),
                  borderRadius: BorderRadius.circular(5),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 220),
                    curve: Curves.easeOutCubic,
                    height: 48,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: snapshot.selectedPresetId == preset.id
                          ? selectedBackground
                          : Colors.transparent,
                      borderRadius: BorderRadius.circular(5),
                    ),
                    child: Text(
                      preset.name,
                      style: theme.textTheme.labelLarge?.copyWith(
                        color: snapshot.selectedPresetId == preset.id
                            ? theme.colorScheme.primary
                            : theme.textTheme.bodySmall?.color,
                      ),
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _FeelingSlider extends StatelessWidget {
  const _FeelingSlider({
    required this.leading,
    required this.trailing,
    required this.value,
    required this.onChanged,
  });

  final String leading;
  final String trailing;
  final double value;
  final ValueChanged<double> onChanged;

  @override
  Widget build(BuildContext context) {
    final secondary = Theme.of(context).textTheme.bodySmall?.color;
    return Row(
      children: [
        SizedBox(
          width: 22,
          child: Text(leading, style: TextStyle(color: secondary)),
        ),
        Expanded(
          child: Semantics(
            label: '$leading$trailing',
            value: '${(value * 100).round()}%',
            child: Slider(
              value: value,
              onChanged: onChanged,
              semanticFormatterCallback: (sliderValue) =>
                  '${(sliderValue * 100).round()}%',
            ),
          ),
        ),
        SizedBox(
          width: 22,
          child: Text(
            trailing,
            textAlign: TextAlign.end,
            style: TextStyle(color: secondary),
          ),
        ),
      ],
    );
  }
}
