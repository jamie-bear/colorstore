import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Color,
  Form,
  Grid,
  Icon,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import {
  getPalettes,
  createPalette,
  deletePalette,
  renamePalette,
  addColorToPalette,
  removeColorFromPalette,
  getColorHistory,
} from "./storage";
import { getColorLabel, hexToRgb, isValidHex, normalizeHex, rgbToHex } from "./utils";
import { Palette } from "./types";

// --- Main palette list ---

export default function Command() {
  const { data: palettes, isLoading, revalidate } = usePromise(getPalettes);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search palettes...">
      {!palettes || palettes.length === 0 ? (
        <List.EmptyView
          title="No palettes yet"
          description="Press ⏎ to create your first palette"
          actions={
            <ActionPanel>
              <Action.Push title="Create Palette" icon={Icon.Plus} target={<CreatePaletteForm onCreated={revalidate} />} />
            </ActionPanel>
          }
        />
      ) : (
        palettes.map((palette) => (
          <List.Item
            key={palette.id}
            title={palette.name}
            subtitle={`${palette.colors.length} color${palette.colors.length !== 1 ? "s" : ""}`}
            accessories={[
              {
                text: new Date(palette.updatedAt).toLocaleDateString(),
                tooltip: "Last updated",
              },
            ]}
            icon={
              palette.colors.length > 0
                ? { source: Icon.CircleFilled, tintColor: palette.colors[0] as Color }
                : Icon.Circle
            }
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Palette"
                  icon={Icon.Eye}
                  target={<PaletteDetail palette={palette} onChanged={revalidate} />}
                />
                <Action.Push
                  title="Create Palette"
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  target={<CreatePaletteForm onCreated={revalidate} />}
                />
                <Action.Push
                  title="Rename Palette"
                  icon={Icon.Pencil}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  target={<RenamePaletteForm palette={palette} onRenamed={revalidate} />}
                />
                <Action
                  title="Delete Palette"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={async () => {
                    const confirmed = await confirmAlert({
                      title: `Delete "${palette.name}"?`,
                      message: `This palette has ${palette.colors.length} color(s). This cannot be undone.`,
                      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
                    });
                    if (confirmed) {
                      await deletePalette(palette.id);
                      revalidate();
                    }
                  }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

// --- Palette detail view ---

function PaletteDetail({ palette, onChanged }: { palette: Palette; onChanged: () => void }) {
  const { data: freshPalettes, revalidate } = usePromise(getPalettes);
  const current = freshPalettes?.find((p) => p.id === palette.id) ?? palette;

  const refresh = () => {
    revalidate();
    onChanged();
  };

  return (
    <List navigationTitle={current.name} searchBarPlaceholder={`Search colors in ${current.name}...`}>
      {current.colors.length === 0 ? (
        <List.EmptyView
          title="No colors in this palette"
          description="Add colors using the actions below"
          actions={
            <ActionPanel>
              <Action.Push
                title="Add Color Manually"
                icon={Icon.Plus}
                target={<AddColorForm paletteId={current.id} onAdded={refresh} />}
              />
              <Action.Push
                title="Open Color Chooser"
                icon={Icon.EyeDropper}
                shortcut={{ modifiers: ["cmd"], key: "k" }}
                target={<ColorChooser paletteId={current.id} onAdded={refresh} />}
              />
              <Action.Push
                title="Add from History"
                icon={Icon.Clock}
                target={<AddFromHistory paletteId={current.id} onAdded={refresh} />}
              />
            </ActionPanel>
          }
        />
      ) : (
        current.colors.map((hex) => {
          const { r, g, b } = hexToRgb(hex);
          const label = getColorLabel(hex);
          return (
            <List.Item
              key={hex}
              title={hex}
              subtitle={`${label} · RGB(${r}, ${g}, ${b})`}
              icon={{ source: Icon.CircleFilled, tintColor: hex as Color }}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Copy">
                    <Action.CopyToClipboard title="Copy Hex" content={hex} />
                    <Action.CopyToClipboard title="Copy RGB" content={`rgb(${r}, ${g}, ${b})`} />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Add Colors">
                    <Action.Push
                      title="Add Color Manually"
                      icon={Icon.Plus}
                      shortcut={{ modifiers: ["cmd"], key: "n" }}
                      target={<AddColorForm paletteId={current.id} onAdded={refresh} />}
                    />
                    <Action.Push
                      title="Open Color Chooser"
                      icon={Icon.EyeDropper}
                      shortcut={{ modifiers: ["cmd"], key: "k" }}
                      target={<ColorChooser paletteId={current.id} onAdded={refresh} />}
                    />
                    <Action.Push
                      title="Add from History"
                      icon={Icon.Clock}
                      shortcut={{ modifiers: ["cmd"], key: "h" }}
                      target={<AddFromHistory paletteId={current.id} onAdded={refresh} />}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Manage">
                    <Action
                      title="Remove Color"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["ctrl"], key: "x" }}
                      onAction={async () => {
                        await removeColorFromPalette(current.id, hex);
                        refresh();
                      }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}

// --- Create palette form ---

function CreatePaletteForm({ onCreated }: { onCreated: () => void }) {
  const { pop } = useNavigation();

  return (
    <Form
      navigationTitle="Create Palette"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Palette"
            onSubmit={async (values: { name: string }) => {
              const name = values.name.trim();
              if (!name) {
                await showToast({ style: Toast.Style.Failure, title: "Name is required" });
                return;
              }
              await createPalette(name);
              onCreated();
              pop();
              await showToast({ style: Toast.Style.Success, title: `Created "${name}"` });
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Palette Name" placeholder="My Colors" autoFocus />
    </Form>
  );
}

// --- Rename palette form ---

function RenamePaletteForm({ palette, onRenamed }: { palette: Palette; onRenamed: () => void }) {
  const { pop } = useNavigation();

  return (
    <Form
      navigationTitle="Rename Palette"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Rename Palette"
            onSubmit={async (values: { name: string }) => {
              const name = values.name.trim();
              if (!name) {
                await showToast({ style: Toast.Style.Failure, title: "Name is required" });
                return;
              }
              await renamePalette(palette.id, name);
              onRenamed();
              pop();
              await showToast({ style: Toast.Style.Success, title: `Renamed to "${name}"` });
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Palette Name" defaultValue={palette.name} autoFocus />
    </Form>
  );
}

// --- HSL to hex helper ---

function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  return rgbToHex(
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  );
}

// --- Generate color palette for the chooser ---

function generateColorPalette(): { section: string; colors: string[] }[] {
  const sections: { section: string; colors: string[] }[] = [];

  // Grayscale row
  const grays: string[] = [];
  for (let i = 0; i <= 10; i++) {
    const v = Math.round((i / 10) * 255);
    grays.push(rgbToHex(v, v, v));
  }
  sections.push({ section: "Grayscale", colors: grays });

  // Hue sections with varying lightness and saturation
  const hueNames: [string, number][] = [
    ["Red", 0], ["Orange", 30], ["Yellow", 55], ["Lime", 80],
    ["Green", 120], ["Teal", 160], ["Cyan", 185], ["Sky Blue", 200],
    ["Blue", 225], ["Indigo", 255], ["Purple", 280], ["Magenta", 310], ["Pink", 340],
  ];

  for (const [name, hue] of hueNames) {
    const colors: string[] = [];
    // Light to dark at full saturation
    for (const l of [0.92, 0.82, 0.72, 0.62, 0.5, 0.42, 0.32, 0.22, 0.14]) {
      colors.push(hslToHex(hue, 1.0, l));
    }
    // Desaturated variants at medium lightness
    for (const s of [0.7, 0.4]) {
      colors.push(hslToHex(hue, s, 0.5));
    }
    sections.push({ section: name, colors });
  }

  return sections;
}

const COLOR_PALETTE = generateColorPalette();

// --- Visual color chooser grid ---

function ColorChooser({ paletteId, onAdded }: { paletteId: string; onAdded: () => void }) {
  const { pop } = useNavigation();

  return (
    <Grid
      navigationTitle="Color Chooser"
      searchBarPlaceholder="Search colors by name or hex..."
      columns={11}
      inset={Grid.Inset.Small}
    >
      {COLOR_PALETTE.map(({ section, colors }) => (
        <Grid.Section key={section} title={section}>
          {colors.map((hex) => {
            const { r, g, b } = hexToRgb(hex);
            const label = getColorLabel(hex);
            return (
              <Grid.Item
                key={`${section}-${hex}`}
                content={{ color: { light: hex, dark: hex, adjustContrast: false } }}
                title={hex}
                subtitle={label}
                keywords={[label, hex, `rgb ${r} ${g} ${b}`]}
                actions={
                  <ActionPanel>
                    <Action
                      title="Add to Palette"
                      icon={Icon.Plus}
                      onAction={async () => {
                        await addColorToPalette(paletteId, hex);
                        onAdded();
                        pop();
                        await showToast({ style: Toast.Style.Success, title: `Added ${hex}` });
                      }}
                    />
                    <Action.CopyToClipboard title="Copy Hex" content={hex} shortcut={{ modifiers: ["cmd"], key: "c" }} />
                    <Action.CopyToClipboard title="Copy RGB" content={`rgb(${r}, ${g}, ${b})`} shortcut={{ modifiers: ["cmd", "shift"], key: "c" }} />
                  </ActionPanel>
                }
              />
            );
          })}
        </Grid.Section>
      ))}
    </Grid>
  );
}

// --- Add color manually form ---

function AddColorForm({ paletteId, onAdded }: { paletteId: string; onAdded: () => void }) {
  const { pop } = useNavigation();

  return (
    <Form
      navigationTitle="Add Color"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add Color"
            onSubmit={async (values: { hex: string; r: string; g: string; b: string }) => {
              let hex = values.hex.trim();

              // If hex is empty, try to build from RGB
              if (!hex && values.r && values.g && values.b) {
                const r = parseInt(values.r, 10);
                const g = parseInt(values.g, 10);
                const b = parseInt(values.b, 10);
                if ([r, g, b].some((v) => isNaN(v) || v < 0 || v > 255)) {
                  await showToast({ style: Toast.Style.Failure, title: "Invalid RGB values (0-255)" });
                  return;
                }
                hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
              }

              // Prepend # if missing
              if (hex && !hex.startsWith("#")) {
                hex = `#${hex}`;
              }

              if (!isValidHex(hex)) {
                await showToast({ style: Toast.Style.Failure, title: "Invalid hex color" });
                return;
              }

              const normalized = normalizeHex(hex);
              await addColorToPalette(paletteId, normalized);
              onAdded();
              pop();
              await showToast({ style: Toast.Style.Success, title: `Added ${normalized}` });
            }}
          />
          <Action.Push
            title="Open Color Chooser"
            icon={Icon.EyeDropper}
            shortcut={{ modifiers: ["cmd"], key: "k" }}
            target={<ColorChooser paletteId={paletteId} onAdded={onAdded} />}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Enter a hex color or RGB values, or open the Color Chooser (⌘K)" />
      <Form.TextField id="hex" title="Hex Color" placeholder="#FF5500" />
      <Form.Separator />
      <Form.TextField id="r" title="Red (0-255)" placeholder="255" />
      <Form.TextField id="g" title="Green (0-255)" placeholder="85" />
      <Form.TextField id="b" title="Blue (0-255)" placeholder="0" />
    </Form>
  );
}

// --- Add color from history ---

function AddFromHistory({ paletteId, onAdded }: { paletteId: string; onAdded: () => void }) {
  const { pop } = useNavigation();
  const { data: history, isLoading } = usePromise(getColorHistory);

  return (
    <List isLoading={isLoading} navigationTitle="Add from History" searchBarPlaceholder="Search history...">
      {!history || history.length === 0 ? (
        <List.EmptyView title="No color history" description="Use 'Pick Color' to build up history" />
      ) : (
        history.map((entry) => {
          const { r, g, b } = hexToRgb(entry.hex);
          const label = getColorLabel(entry.hex);
          return (
            <List.Item
              key={entry.hex + entry.pickedAt}
              title={entry.hex}
              subtitle={`${label} · RGB(${r}, ${g}, ${b})`}
              icon={{ source: Icon.CircleFilled, tintColor: entry.hex as Color }}
              actions={
                <ActionPanel>
                  <Action
                    title="Add to Palette"
                    icon={Icon.Plus}
                    onAction={async () => {
                      await addColorToPalette(paletteId, entry.hex);
                      onAdded();
                      pop();
                      await showToast({ style: Toast.Style.Success, title: `Added ${entry.hex}` });
                    }}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
