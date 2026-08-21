import 'dart:ui';

import 'package:flutter/material.dart';

import '../../audio/soundscape_controller.dart';
import '../../audio/soundscape_runtime.dart';
import '../../domain/soundscape_catalog.dart';
import '../../domain/soundscape_scene.dart';
import '../theme/soundscape_theme.dart';
import 'player_control_rail.dart';

class SoundscapePlayerSurface extends StatefulWidget {
  const SoundscapePlayerSurface({
    required this.snapshot,
    required this.controller,
    required this.expansion,
    required this.immersion,
    required this.chromeVisible,
    required this.transitioning,
    required this.onInformationTap,
    required this.onTogglePlayback,
    required this.onArtworkTap,
    required this.onTopRightTap,
    required this.onUserActivity,
    super.key,
  });

  final SoundscapeSnapshot snapshot;
  final SoundscapeController controller;
  final double expansion;
  final double immersion;
  final bool chromeVisible;
  final bool transitioning;
  final VoidCallback? onInformationTap;
  final Future<void> Function() onTogglePlayback;
  final VoidCallback onArtworkTap;
  final VoidCallback onTopRightTap;
  final VoidCallback onUserActivity;

  @override
  State<SoundscapePlayerSurface> createState() =>
      _SoundscapePlayerSurfaceState();
}

class _SoundscapePlayerSurfaceState extends State<SoundscapePlayerSurface>
    with SingleTickerProviderStateMixin {
  late final AnimationController _breathing;

  @override
  void initState() {
    super.initState();
    _breathing = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 4200),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _breathing.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final dark = theme.brightness == Brightness.dark;
    final surface = dark
        ? SoundscapeColors.darkSurface
        : SoundscapeColors.surface;
    final playerBackground = Color.lerp(
      surface,
      const Color(0xFF0A0D0C),
      widget.immersion,
    );
    final expansionOpacity = Curves.easeOut.transform(
      ((widget.expansion - 0.08) / 0.56).clamp(0.0, 1.0),
    );
    final compact = widget.immersion > 0.5;
    final chromeOpacity = compact
        ? (widget.chromeVisible ? 1.0 : 0.0)
        : expansionOpacity;
    final safeTop = MediaQuery.paddingOf(context).top;
    final railTotalHeight =
        playerRailHeight + MediaQuery.paddingOf(context).bottom;
    final listeningHeight = MediaQuery.sizeOf(context).height - railTotalHeight;

    return Listener(
      onPointerDown: (_) => widget.onUserActivity(),
      onPointerMove: (_) => widget.onUserActivity(),
      child: ClipRect(
        child: ColoredBox(
          color: playerBackground ?? surface,
          child: Stack(
            fit: StackFit.expand,
            children: [
              IgnorePointer(
                ignoring: widget.immersion < 0.5,
                child: Opacity(
                  opacity: widget.immersion,
                  child: _ImmersiveBackdrop(
                    snapshot: widget.snapshot,
                    onActivity: widget.onUserActivity,
                  ),
                ),
              ),
              Positioned(
                left: 0,
                right: 0,
                top: 0,
                height: listeningHeight,
                child: IgnorePointer(
                  ignoring: widget.expansion < 0.9 || compact,
                  child: Opacity(
                    opacity: expansionOpacity * (1 - widget.immersion),
                    child: _ListeningContent(
                      snapshot: widget.snapshot,
                      controller: widget.controller,
                      breathing: _breathing,
                      onArtworkTap: widget.onArtworkTap,
                    ),
                  ),
                ),
              ),
              Positioned(
                left: 0,
                right: 0,
                top: 0,
                height: safeTop + 66,
                child: IgnorePointer(
                  child: Opacity(
                    opacity: expansionOpacity * (1 - widget.immersion),
                    child: ColoredBox(color: surface),
                  ),
                ),
              ),
              Positioned(
                left: 0,
                right: 0,
                bottom: 0,
                child: IgnorePointer(
                  ignoring: compact && !widget.chromeVisible,
                  child: AnimatedOpacity(
                    opacity: compact ? chromeOpacity : 1,
                    duration: const Duration(milliseconds: 260),
                    curve: Curves.easeOut,
                    child: PlayerControlRail(
                      snapshot: widget.snapshot,
                      controller: widget.controller,
                      onInformationTap: widget.onInformationTap,
                      onTogglePlayback: widget.onTogglePlayback,
                      transitioning: widget.transitioning,
                      compact: compact,
                    ),
                  ),
                ),
              ),
              Positioned(
                left: 20,
                top: safeTop + 14,
                child: IgnorePointer(
                  ignoring: chromeOpacity < 0.9,
                  child: AnimatedOpacity(
                    opacity: chromeOpacity,
                    duration: const Duration(milliseconds: 240),
                    child: _PlayerBrand(darkBackdrop: compact),
                  ),
                ),
              ),
              Positioned(
                right: 18,
                top: safeTop + 12,
                child: IgnorePointer(
                  ignoring: chromeOpacity < 0.9,
                  child: AnimatedOpacity(
                    opacity: chromeOpacity,
                    duration: const Duration(milliseconds: 240),
                    child: _TopRightControl(
                      immersive: compact,
                      onPressed: widget.onTopRightTap,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PlayerBrand extends StatelessWidget {
  const _PlayerBrand({required this.darkBackdrop});

  final bool darkBackdrop;

  @override
  Widget build(BuildContext context) {
    final foreground = darkBackdrop
        ? Colors.white
        : Theme.of(context).colorScheme.onSurface;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Image.asset(
          'assets/images/soundscape-mark.png',
          width: 22,
          height: 22,
          color: foreground,
          colorBlendMode: BlendMode.srcIn,
        ),
        const SizedBox(width: 9),
        Text(
          '声景',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
            color: foreground,
            fontFamily: 'Noto Serif SC',
            fontFamilyFallback: const ['Songti SC', 'SimSun'],
            fontWeight: FontWeight.w700,
          ),
        ),
      ],
    );
  }
}

class _TopRightControl extends StatelessWidget {
  const _TopRightControl({required this.immersive, required this.onPressed});

  final bool immersive;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final foreground = immersive
        ? Colors.white
        : Theme.of(context).colorScheme.onSurface;
    return IconButton(
      tooltip: immersive ? '返回播放器' : '收起播放器',
      onPressed: onPressed,
      style: IconButton.styleFrom(
        foregroundColor: foreground,
        backgroundColor: immersive
            ? Colors.black.withValues(alpha: 0.18)
            : Colors.transparent,
      ),
      icon: AnimatedSwitcher(
        duration: const Duration(milliseconds: 240),
        switchInCurve: Curves.easeOut,
        switchOutCurve: Curves.easeIn,
        transitionBuilder: (child, animation) => RotationTransition(
          turns: Tween<double>(begin: -0.08, end: 0).animate(animation),
          child: FadeTransition(opacity: animation, child: child),
        ),
        child: Icon(
          immersive ? Icons.close_rounded : Icons.keyboard_arrow_down_rounded,
          key: ValueKey(immersive ? 'leave-immersive' : 'collapse-player'),
          size: 24,
        ),
      ),
    );
  }
}

class _ListeningContent extends StatelessWidget {
  const _ListeningContent({
    required this.snapshot,
    required this.controller,
    required this.breathing,
    required this.onArtworkTap,
  });

  final SoundscapeSnapshot snapshot;
  final SoundscapeController controller;
  final Animation<double> breathing;
  final VoidCallback onArtworkTap;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final minimumHeroHeight = constraints.maxWidth < 760 ? 720.0 : 550.0;
        final heroHeight = constraints.maxHeight < minimumHeroHeight
            ? minimumHeroHeight
            : constraints.maxHeight;
        return CustomScrollView(
          physics: const BouncingScrollPhysics(
            parent: AlwaysScrollableScrollPhysics(),
          ),
          slivers: [
            SliverToBoxAdapter(
              child: SizedBox(
                height: heroHeight,
                child: _ListeningHero(
                  snapshot: snapshot,
                  controller: controller,
                  breathing: breathing,
                  onArtworkTap: onArtworkTap,
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: _LayerCollection(
                snapshot: snapshot,
                controller: controller,
              ),
            ),
          ],
        );
      },
    );
  }
}

class _ListeningHero extends StatelessWidget {
  const _ListeningHero({
    required this.snapshot,
    required this.controller,
    required this.breathing,
    required this.onArtworkTap,
  });

  final SoundscapeSnapshot snapshot;
  final SoundscapeController controller;
  final Animation<double> breathing;
  final VoidCallback onArtworkTap;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final compact = constraints.maxWidth < 760;
        final top = MediaQuery.paddingOf(context).top + 76;
        final content = compact
            ? _MobileListeningHero(
                snapshot: snapshot,
                controller: controller,
                breathing: breathing,
                onArtworkTap: onArtworkTap,
              )
            : _WideListeningHero(
                snapshot: snapshot,
                controller: controller,
                breathing: breathing,
                onArtworkTap: onArtworkTap,
              );

        return Padding(
          padding: EdgeInsets.fromLTRB(
            compact ? 22 : 48,
            top,
            compact ? 22 : 48,
            18,
          ),
          child: Column(
            children: [
              Expanded(child: content),
              Padding(
                padding: const EdgeInsets.only(top: 14),
                child: Icon(
                  Icons.keyboard_arrow_down_rounded,
                  size: 22,
                  color: Theme.of(context).colorScheme.onSurface
                      .withValues(alpha: 0.34),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _WideListeningHero extends StatelessWidget {
  const _WideListeningHero({
    required this.snapshot,
    required this.controller,
    required this.breathing,
    required this.onArtworkTap,
  });

  final SoundscapeSnapshot snapshot;
  final SoundscapeController controller;
  final Animation<double> breathing;
  final VoidCallback onArtworkTap;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 1040),
        child: Row(
          children: [
            Expanded(
              flex: 10,
              child: Align(
                alignment: Alignment.centerRight,
                child: _ArtworkPortal(
                  asset: snapshot.scene.coverAsset,
                  size: 390,
                  breathing: breathing,
                  onTap: onArtworkTap,
                ),
              ),
            ),
            const SizedBox(width: 72),
            Expanded(
              flex: 11,
              child: _ListeningControls(
                snapshot: snapshot,
                controller: controller,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _MobileListeningHero extends StatelessWidget {
  const _MobileListeningHero({
    required this.snapshot,
    required this.controller,
    required this.breathing,
    required this.onArtworkTap,
  });

  final SoundscapeSnapshot snapshot;
  final SoundscapeController controller;
  final Animation<double> breathing;
  final VoidCallback onArtworkTap;

  @override
  Widget build(BuildContext context) {
    final viewportWidth = MediaQuery.sizeOf(context).width;
    final artworkSize = clampDouble(viewportWidth - 88, 205, 282);
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        _ArtworkPortal(
          asset: snapshot.scene.coverAsset,
          size: artworkSize,
          breathing: breathing,
          onTap: onArtworkTap,
        ),
        const SizedBox(height: 28),
        _ListeningControls(snapshot: snapshot, controller: controller),
      ],
    );
  }
}

class _ArtworkPortal extends StatefulWidget {
  const _ArtworkPortal({
    required this.asset,
    required this.size,
    required this.breathing,
    required this.onTap,
  });

  final String asset;
  final double size;
  final Animation<double> breathing;
  final VoidCallback onTap;

  @override
  State<_ArtworkPortal> createState() => _ArtworkPortalState();
}

class _ArtworkPortalState extends State<_ArtworkPortal> {
  bool _hovered = false;

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    return Semantics(
      button: true,
      label: '进入沉浸聆听',
      child: MouseRegion(
        cursor: SystemMouseCursors.click,
        onEnter: (_) => setState(() => _hovered = true),
        onExit: (_) => setState(() => _hovered = false),
        child: GestureDetector(
          onTap: widget.onTap,
          child: AnimatedBuilder(
            animation: widget.breathing,
            builder: (context, child) {
              final motionDisabled = MediaQuery.disableAnimationsOf(context);
              final pulse = motionDisabled
                  ? 1.0
                  : 0.998 + (widget.breathing.value * 0.004);
              return Transform.scale(scale: pulse, child: child);
            },
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 360),
              curve: Curves.easeOutCubic,
              width: widget.size,
              height: widget.size,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(8),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(
                      alpha: _hovered
                          ? (dark ? 0.34 : 0.18)
                          : (dark ? 0.24 : 0.12),
                    ),
                    offset: Offset(0, _hovered ? 20 : 15),
                    blurRadius: _hovered ? 48 : 38,
                  ),
                ],
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: Image.asset(widget.asset, fit: BoxFit.cover),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

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

class _ImmersiveBackdrop extends StatelessWidget {
  const _ImmersiveBackdrop({required this.snapshot, required this.onActivity});

  final SoundscapeSnapshot snapshot;
  final VoidCallback onActivity;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onActivity,
      child: Stack(
        fit: StackFit.expand,
        children: [
          Image.asset(snapshot.scene.heroAsset, fit: BoxFit.cover),
          ColoredBox(color: Colors.black.withValues(alpha: 0.32)),
          SafeArea(
            child: Center(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 32),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      snapshot.scene.name,
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.displayLarge?.copyWith(
                        color: Colors.white,
                        fontSize: MediaQuery.sizeOf(context).width < 600
                            ? 39
                            : 52,
                      ),
                    ),
                    const SizedBox(height: 15),
                    Text(
                      snapshot.scene.description,
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                        color: Colors.white.withValues(alpha: 0.72),
                        height: 1.7,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
