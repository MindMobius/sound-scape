part of 'soundscape_home_screen.dart';

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
                        'assets/generated/images/soundscape-mark.png',
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
