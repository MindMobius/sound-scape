part of 'soundscape_player_surface.dart';

class _ListeningControls extends StatelessWidget {
  const _ListeningControls({required this.snapshot, required this.controller});

  final SoundscapeSnapshot snapshot;
  final SoundscapeController controller;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 430),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(snapshot.scene.name, style: theme.textTheme.headlineLarge),
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

class _LayerCollection extends StatelessWidget {
  const _LayerCollection({required this.snapshot, required this.controller});

  final SoundscapeSnapshot snapshot;
  final SoundscapeController controller;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final dark = theme.brightness == Brightness.dark;
    return ColoredBox(
      color: dark ? SoundscapeColors.darkGround : SoundscapeColors.ground,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(24, 58, 24, 120),
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 820),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('让这一处声音，更像你此刻想听的样子。', style: theme.textTheme.titleLarge),
                const SizedBox(height: 12),
                Text(
                  '保留环境的自然变化，只调整你想靠近或远离的声音。',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: theme.textTheme.bodySmall?.color,
                  ),
                ),
                const SizedBox(height: 36),
                for (
                  var index = 0;
                  index < snapshot.layers.length;
                  index++
                ) ...[
                  if (index > 0) Divider(height: 1, color: theme.dividerColor),
                  _LayerRow(
                    layer: snapshot.layers[index],
                    controller: controller,
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _LayerRow extends StatelessWidget {
  const _LayerRow({required this.layer, required this.controller});

  final SoundLayerSnapshot layer;
  final SoundscapeController controller;

  @override
  Widget build(BuildContext context) {
    final descriptor = switch (layer.definition.kind) {
      SoundLayerKind.bed => '一直在',
      SoundLayerKind.texture => '缓缓变化',
      SoundLayerKind.event => '偶尔响起',
    };
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 20),
      child: Row(
        children: [
          Expanded(
            flex: 4,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  layer.definition.name,
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 3),
                Text(descriptor, style: Theme.of(context).textTheme.bodySmall),
              ],
            ),
          ),
          Expanded(
            flex: 5,
            child: Semantics(
              label: '${layer.definition.name}的存在感',
              value: '${(layer.presence * 100).round()}%',
              child: Slider(
                value: layer.presence,
                onChanged: layer.enabled
                    ? (value) => controller.setLayerPresence(
                        layer.definition.id,
                        value,
                      )
                    : null,
                semanticFormatterCallback: (value) =>
                    '${(value * 100).round()}%',
              ),
            ),
          ),
          const SizedBox(width: 12),
          Semantics(
            label: '${layer.definition.name}开关',
            child: Switch(
              value: layer.enabled,
              onChanged: (enabled) => controller.setLayerEnabled(
                layer.definition.id,
                enabled: enabled,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
