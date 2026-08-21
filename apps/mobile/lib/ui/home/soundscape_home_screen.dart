import 'dart:async';
import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../audio/soundscape_controller.dart';
import '../../audio/soundscape_runtime.dart';
import '../../domain/soundscape_catalog.dart';
import '../../domain/soundscape_scene.dart';
import '../player/player_control_rail.dart';
import '../player/soundscape_player_surface.dart';

class SoundscapeHomeScreen extends StatefulWidget {
  const SoundscapeHomeScreen({required this.audioController, super.key});

  final SoundscapeController audioController;

  @override
  State<SoundscapeHomeScreen> createState() => _SoundscapeHomeScreenState();
}

class _SoundscapeHomeScreenState extends State<SoundscapeHomeScreen>
    with TickerProviderStateMixin {
  late final AnimationController _playerExpansion;
  late final AnimationController _immersion;
  Timer? _chromeTimer;
  bool _expanded = false;
  bool _immersive = false;
  bool _chromeVisible = true;
  bool _transitioning = false;

  @override
  void initState() {
    super.initState();
    _playerExpansion = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 520),
      reverseDuration: const Duration(milliseconds: 460),
    );
    _immersion = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 420),
      reverseDuration: const Duration(milliseconds: 360),
    );
  }

  @override
  void dispose() {
    _chromeTimer?.cancel();
    _playerExpansion.dispose();
    _immersion.dispose();
    super.dispose();
  }

  Future<void> _togglePlayback(SoundscapeSnapshot snapshot) async {
    if (_transitioning || !snapshot.isReady) return;
    setState(() => _transitioning = true);
    try {
      if (snapshot.isPlaying) {
        await widget.audioController.pause();
        _showChrome(keepVisible: true);
      } else {
        await widget.audioController.play();
        if (_immersive) _showChrome();
      }
    } finally {
      if (mounted) setState(() => _transitioning = false);
    }
  }

  void _expandPlayer() {
    if (_expanded) return;
    setState(() => _expanded = true);
    _playerExpansion.forward();
  }

  Future<void> _collapsePlayer() async {
    if (_immersive) {
      await _leaveImmersive();
      return;
    }
    if (!_expanded) return;
    await _playerExpansion.reverse();
    if (mounted) setState(() => _expanded = false);
  }

  void _enterImmersive(SoundscapeSnapshot snapshot) {
    if (!_expanded || _immersive) return;
    setState(() {
      _immersive = true;
      _chromeVisible = true;
    });
    _immersion.forward();
    if (snapshot.isPlaying) _showChrome();
  }

  Future<void> _leaveImmersive() async {
    if (!_immersive) return;
    _chromeTimer?.cancel();
    if (mounted) setState(() => _chromeVisible = true);
    await _immersion.reverse();
    if (mounted) setState(() => _immersive = false);
  }

  void _showChrome({bool keepVisible = false}) {
    if (!_immersive) return;
    _chromeTimer?.cancel();
    if (!_chromeVisible && mounted) setState(() => _chromeVisible = true);
    if (keepVisible || !widget.audioController.snapshot.isPlaying) return;
    _chromeTimer = Timer(const Duration(seconds: 4), () {
      if (mounted && _immersive && widget.audioController.snapshot.isPlaying) {
        setState(() => _chromeVisible = false);
      }
    });
  }

  Future<void> _chooseScene(
    SoundscapeScene scene,
    SoundscapeSnapshot snapshot,
  ) async {
    if (_transitioning) return;
    if (scene.id == snapshot.scene.id && snapshot.isPlaying) {
      _expandPlayer();
      return;
    }
    setState(() => _transitioning = true);
    try {
      await widget.audioController.selectScene(scene.id, autoplay: true);
    } finally {
      if (mounted) setState(() => _transitioning = false);
    }
  }

  void _handleEscape() {
    if (_immersive) {
      unawaited(_leaveImmersive());
    } else if (_expanded) {
      unawaited(_collapsePlayer());
    }
  }

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<SoundscapeSnapshot>(
      stream: widget.audioController.snapshots,
      initialData: widget.audioController.snapshot,
      builder: (context, stateSnapshot) {
        final snapshot = stateSnapshot.data ?? widget.audioController.snapshot;
        return PopScope(
          canPop: !_expanded,
          onPopInvokedWithResult: (didPop, result) {
            if (!didPop) _handleEscape();
          },
          child: CallbackShortcuts(
            bindings: <ShortcutActivator, VoidCallback>{
              const SingleActivator(LogicalKeyboardKey.escape): _handleEscape,
            },
            child: Focus(
              autofocus: true,
              child: LayoutBuilder(
                builder: (context, constraints) {
                  final safeBottom = MediaQuery.paddingOf(context).bottom;
                  final collapsedHeight = playerRailHeight + safeBottom;
                  return AnimatedBuilder(
                    animation: Listenable.merge([_playerExpansion, _immersion]),
                    builder: (context, child) {
                      final expansion = Curves.easeOutCubic.transform(
                        _playerExpansion.value,
                      );
                      final immersion = Curves.easeOutCubic.transform(
                        _immersion.value,
                      );
                      final playerHeight = lerpDouble(
                        collapsedHeight,
                        constraints.maxHeight,
                        expansion,
                      )!;
                      return Scaffold(
                        body: Stack(
                          fit: StackFit.expand,
                          children: [
                            _HomeContent(
                              snapshot: snapshot,
                              bottomPadding: collapsedHeight + 34,
                              transitioning: _transitioning,
                              onSceneTap: (scene) =>
                                  unawaited(_chooseScene(scene, snapshot)),
                            ),
                            Positioned(
                              left: 0,
                              right: 0,
                              bottom: 0,
                              height: playerHeight,
                              child: SoundscapePlayerSurface(
                                snapshot: snapshot,
                                controller: widget.audioController,
                                expansion: expansion,
                                immersion: immersion,
                                chromeVisible: _chromeVisible,
                                transitioning: _transitioning,
                                onInformationTap: _expanded
                                    ? null
                                    : _expandPlayer,
                                onTogglePlayback: () =>
                                    _togglePlayback(snapshot),
                                onArtworkTap: () => _enterImmersive(snapshot),
                                onTopRightTap: () {
                                  if (_immersive) {
                                    unawaited(_leaveImmersive());
                                  } else {
                                    unawaited(_collapsePlayer());
                                  }
                                },
                                onUserActivity: _showChrome,
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  );
                },
              ),
            ),
          ),
        );
      },
    );
  }
}

class _HomeContent extends StatelessWidget {
  const _HomeContent({
    required this.snapshot,
    required this.bottomPadding,
    required this.transitioning,
    required this.onSceneTap,
  });

  final SoundscapeSnapshot snapshot;
  final double bottomPadding;
  final bool transitioning;
  final ValueChanged<SoundscapeScene> onSceneTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final compact = MediaQuery.sizeOf(context).width < 720;
    return CustomScrollView(
      slivers: [
        SliverToBoxAdapter(
          child: SafeArea(
            bottom: false,
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 1120),
                child: Padding(
                  padding: EdgeInsets.fromLTRB(
                    compact ? 22 : 40,
                    20,
                    compact ? 22 : 40,
                    0,
                  ),
                  child: Row(
                    children: [
                      Image.asset(
                        'assets/images/soundscape-mark.png',
                        width: 24,
                        height: 24,
                        color: theme.colorScheme.onSurface,
                        colorBlendMode: BlendMode.srcIn,
                      ),
                      const SizedBox(width: 10),
                      Text(
                        '声景',
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontFamily: 'Noto Serif SC',
                          fontFamilyFallback: const ['Songti SC', 'SimSun'],
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
        SliverPadding(
          padding: EdgeInsets.fromLTRB(
            compact ? 22 : 40,
            compact ? 52 : 78,
            compact ? 22 : 40,
            bottomPadding,
          ),
          sliver: SliverToBoxAdapter(
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 1120),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '想听见哪里？',
                      style: compact
                          ? theme.textTheme.headlineLarge?.copyWith(
                              fontSize: 30,
                            )
                          : theme.textTheme.displayLarge,
                    ),
                    const SizedBox(height: 14),
                    Text(
                      '选一处，让声音慢慢铺开。',
                      style: theme.textTheme.bodyLarge?.copyWith(
                        color: theme.textTheme.bodySmall?.color,
                      ),
                    ),
                    SizedBox(height: compact ? 36 : 52),
                    LayoutBuilder(
                      builder: (context, constraints) {
                        final columns = constraints.maxWidth >= 760 ? 2 : 1;
                        final width = columns == 2
                            ? (constraints.maxWidth - 28) / 2
                            : constraints.maxWidth;
                        return Wrap(
                          spacing: 28,
                          runSpacing: compact ? 34 : 42,
                          children: [
                            for (final scene in SoundscapeCatalog.scenes)
                              SizedBox(
                                width: width,
                                child: _SceneTile(
                                  scene: scene,
                                  selected: snapshot.scene.id == scene.id,
                                  playing:
                                      snapshot.scene.id == scene.id &&
                                      snapshot.isPlaying,
                                  transitioning:
                                      transitioning &&
                                      snapshot.scene.id == scene.id,
                                  onTap: () => onSceneTap(scene),
                                ),
                              ),
                          ],
                        );
                      },
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _SceneTile extends StatefulWidget {
  const _SceneTile({
    required this.scene,
    required this.selected,
    required this.playing,
    required this.transitioning,
    required this.onTap,
  });

  final SoundscapeScene scene;
  final bool selected;
  final bool playing;
  final bool transitioning;
  final VoidCallback onTap;

  @override
  State<_SceneTile> createState() => _SceneTileState();
}

class _SceneTileState extends State<_SceneTile> {
  bool _hovered = false;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final status = widget.playing
        ? '正在聆听'
        : widget.selected
        ? '继续聆听'
        : '开始聆听';
    return Semantics(
      button: true,
      selected: widget.selected,
      label: '${widget.scene.name}，$status',
      child: MouseRegion(
        cursor: SystemMouseCursors.click,
        onEnter: (_) => setState(() => _hovered = true),
        onExit: (_) => setState(() => _hovered = false),
        child: InkWell(
          onTap: widget.onTap,
          borderRadius: BorderRadius.circular(8),
          child: Padding(
            padding: const EdgeInsets.only(bottom: 4),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                AnimatedContainer(
                  duration: const Duration(milliseconds: 300),
                  curve: Curves.easeOutCubic,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: widget.selected
                          ? theme.colorScheme.primary.withValues(alpha: 0.64)
                          : Colors.transparent,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(
                          alpha: _hovered ? 0.14 : 0.08,
                        ),
                        offset: Offset(0, _hovered ? 16 : 11),
                        blurRadius: _hovered ? 34 : 26,
                      ),
                    ],
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(7),
                    child: AspectRatio(
                      aspectRatio: 1.48,
                      child: Image.asset(
                        widget.scene.coverAsset,
                        fit: BoxFit.cover,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 18),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            widget.scene.name,
                            style: theme.textTheme.titleLarge,
                          ),
                          const SizedBox(height: 6),
                          Text(
                            widget.scene.description,
                            style: theme.textTheme.bodyMedium?.copyWith(
                              color: theme.textTheme.bodySmall?.color,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 16),
                    Padding(
                      padding: const EdgeInsets.only(top: 3),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (widget.transitioning)
                            SizedBox.square(
                              dimension: 13,
                              child: CircularProgressIndicator(
                                strokeWidth: 1.5,
                                color: theme.colorScheme.primary,
                              ),
                            )
                          else
                            Container(
                              width: 5,
                              height: 5,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: widget.selected
                                    ? theme.colorScheme.primary
                                    : theme.dividerColor,
                              ),
                            ),
                          const SizedBox(width: 7),
                          Text(
                            status,
                            style: theme.textTheme.labelLarge?.copyWith(
                              color: widget.selected
                                  ? theme.colorScheme.primary
                                  : theme.textTheme.bodySmall?.color,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
