import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Color,
  Icon,
  List,
  confirmAlert,
  showToast,
  Toast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getColorHistory, removeColorFromHistory, clearColorHistory, getPalettes, addColorToPalette } from "./storage";
import { getColorLabel, hexToRgb } from "./utils";

export default function Command() {
  const { data: history, isLoading, revalidate } = usePromise(getColorHistory);
  const { data: palettes, revalidate: revalidatePalettes } = usePromise(getPalettes);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search color history...">
      {!history || history.length === 0 ? (
        <List.EmptyView title="No colors picked yet" description="Use the 'Pick Color' command to get started" />
      ) : (
        history.map((entry) => {
          const { r, g, b } = hexToRgb(entry.hex);
          const label = getColorLabel(entry.hex);
          const pickedDate = new Date(entry.pickedAt).toLocaleString();

          return (
            <List.Item
              key={entry.hex + entry.pickedAt}
              title={entry.hex}
              subtitle={`${label} · RGB(${r}, ${g}, ${b})`}
              accessories={[{ text: pickedDate, tooltip: "Picked at" }]}
              icon={{ source: Icon.CircleFilled, tintColor: entry.hex as Color }}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Copy">
                    <Action.CopyToClipboard title="Copy Hex" content={entry.hex} />
                    <Action.CopyToClipboard title="Copy RGB" content={`rgb(${r}, ${g}, ${b})`} />
                    <Action.CopyToClipboard title="Copy CSS RGB" content={`rgb(${r} ${g} ${b})`} />
                  </ActionPanel.Section>

                  {palettes && palettes.length > 0 && (
                    <ActionPanel.Section title="Add to Palette">
                      {palettes.map((palette) => (
                        <Action
                          key={palette.id}
                          title={`Add to "${palette.name}"`}
                          icon={Icon.Plus}
                          onAction={async () => {
                            try {
                              await addColorToPalette(palette.id, entry.hex);
                              revalidatePalettes();
                              await showToast({ style: Toast.Style.Success, title: `Added to ${palette.name}` });
                            } catch {
                              revalidatePalettes();
                              await showToast({ style: Toast.Style.Failure, title: "Palette not found", message: "It may have been deleted" });
                            }
                          }}
                        />
                      ))}
                    </ActionPanel.Section>
                  )}

                  <ActionPanel.Section title="Manage">
                    <Action.Paste title="Paste Hex" content={entry.hex} />
                    <Action
                      title="Remove from History"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["ctrl"], key: "x" }}
                      onAction={async () => {
                        await removeColorFromHistory(entry.hex);
                        revalidate();
                      }}
                    />
                    <Action
                      title="Clear All History"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
                      onAction={async () => {
                        const confirmed = await confirmAlert({
                          title: "Clear All Color History?",
                          message: "This action cannot be undone.",
                          primaryAction: { title: "Clear", style: Alert.ActionStyle.Destructive },
                        });
                        if (confirmed) {
                          await clearColorHistory();
                          revalidate();
                        }
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
