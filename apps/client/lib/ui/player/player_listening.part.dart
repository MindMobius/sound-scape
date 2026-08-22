part of 'soundscape_player_surface.dart';

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
