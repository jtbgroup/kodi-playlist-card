# Development Guidelines

Best practices for maintaining and extending the Kodi Playlist Card.

## Code Organization Principles

### 1. Single Responsibility Principle

Each file has one clear purpose:

```
✅ GOOD:
- kodi-playlist-card.ts: Component logic only
- styles.scss: All styling
- types.ts: Type definitions
- utils.ts: Reusable functions
- config.ts: Configuration handling

❌ BAD:
- All logic in one 1000+ line file
- Styling scattered across multiple files
- Business logic mixed with rendering
```

### 2. Separation of Concerns

**Logic Layer** (kodi-playlist-card.ts)
- Component lifecycle
- State management
- Event handling
- WebSocket subscriptions

**Presentation Layer** (styles.scss)
- Visual design
- Responsive layouts
- Animations
- CSS variables

**Data Layer** (types.ts, config.ts, utils.ts)
- Type definitions
- Data validation
- Transformation functions

### 3. Component Structure

```typescript
export class KodiPlaylistCard extends LitElement {
    // 1. Properties & State
    @property() hass!: HomeAssistant;
    @state() _config?: KodiPlaylistCardConfig;
    @state() _items: PlaylistItem[] = [];
    
    // 2. Lifecycle Methods
    public connectedCallback(): void { }
    public disconnectedCallback(): void { }
    protected updated(changed: PropertyValues): void { }
    
    // 3. Public API
    public setConfig(config: any): void { }
    public getCardSize(): number { }
    
    // 4. Private Methods (organized by feature)
    // Subscription management
    private _subscribeToPlaylistUpdates(): void { }
    private _unsubscribeFromPlaylistUpdates(): void { }
    
    // Event handling
    private _handlePlaylistEvent(event: KodiMediaSensorEvent): void { }
    
    // Keep-alive
    private _startKeepAlive(): void { }
    private _stopKeepAlive(): void { }
    
    // Rendering
    private _renderHeader(): TemplateResult { }
    private _renderContent(): TemplateResult { }
    private _renderPlaylistItem(): TemplateResult { }
    
    // 5. Render Method
    protected render(): TemplateResult { }
}
```

## File Guidelines

### TypeScript Files (.ts)

#### Import Organization
```typescript
// 1. Standard library imports
import { LitElement, html, css, PropertyValues, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";

// 2. Third-party imports
import { HomeAssistant } from "custom-card-helpers";

// 3. Local imports (organized by type)
import styles from "./styles.scss";
import { PlaylistItem, KodiPlaylistCardConfig, ConnectionState } from "./types";
import { validateConfig } from "./config";
import { formatDuration, formatArtist, buildMetadataString } from "./utils";
```

#### Naming Conventions
```typescript
// Classes: PascalCase
export class KodiPlaylistCard extends LitElement { }

// Public methods: camelCase
public setConfig(config: any): void { }
public getCardSize(): number { }

// Private methods: _camelCase with leading underscore
private _subscribeToPlaylistUpdates(): void { }
private _handlePlaylistEvent(event): void { }

// Constants: UPPER_SNAKE_CASE
const DEFAULT_TITLE = "Audio Playlist";
const KEEP_ALIVE_INTERVAL_MS = 2000;

// State properties: _camelCase (convention for private state)
@state() private _config?: KodiPlaylistCardConfig;
@state() private _items: PlaylistItem[] = [];
```

#### Documentation
```typescript
/**
 * Subscribe to kodi_media_sensors playlist updates via WebSocket
 * 
 * @description
 * Establishes connection to Home Assistant WebSocket and subscribes
 * to playlist_update events from the kodi_media_sensors integration.
 * 
 * @throws {Error} If subscription fails
 * 
 * @example
 * this._subscribeToPlaylistUpdates();
 */
private _subscribeToPlaylistUpdates(): void {
    // Implementation
}
```

### SCSS Files (.scss)

#### Nesting & Organization
```scss
// ✅ GOOD: Organized sections
:host {
    display: block;
    --custom-vars: value;
}

// ============================================================================
// HEADER
// ============================================================================

.card-header {
    display: flex;
    // Properties organized: display, layout, positioning, sizing, styling, animation
}

.card-title {
    // Nested styles within logical groups
}

// ============================================================================
// CONTENT
// ============================================================================

.card-content {
    // Another major section
}

// ============================================================================
// UTILITIES
// ============================================================================

@media (max-width: 400px) {
    // Responsive adjustments at end
}
```

#### CSS Variables
```scss
// Define all variables at :host level
:host {
    --kodi-primary-color: var(--primary-color, #03a9f4);
    --kodi-text-primary: var(--primary-text-color, #212121);
    --kodi-text-secondary: var(--secondary-text-color, #757575);
    --kodi-divider: var(--divider-color, rgba(0, 0, 0, 0.12));
    --kodi-background: var(--card-background-color, #ffffff);
    // Use throughout as: var(--kodi-primary-color)
}
```

#### Responsive Design
```scss
// ✅ Mobile-first approach
.playlist-item {
    grid-template-columns: 48px 1fr auto;  // Mobile default
    padding: 10px 12px;
    // Mobile-optimized sizing
}

// Scale up on larger screens
@media (min-width: 600px) {
    .playlist-item {
        grid-template-columns: 56px 1fr auto;  // Desktop size
        padding: 12px 16px;
    }
}
```

### Type Definition Files (.ts)

```typescript
// ✅ GOOD: Well-documented types with clear structure

/**
 * Playlist item as received from kodi_media_sensors integration
 */
export interface PlaylistItem {
    title?: string;
    artist?: string | string[];
    album?: string;
    duration?: number;
    thumbnail?: string;
    // ... other optional fields
}

/**
 * Incoming event from the integration
 */
export type KodiMediaSensorEvent = PlaylistUpdateEvent | KodiUnavailableEvent;

/**
 * Connection state enumeration
 */
export enum ConnectionState {
    IDLE = "idle",
    CONNECTING = "connecting",
    CONNECTED = "connected",
    UNAVAILABLE = "unavailable",
    ERROR = "error",
}
```

## Testing Best Practices

### Unit Testing Utilities

Create separate test files for utilities:

```typescript
// utils.test.ts
import { formatDuration, formatArtist } from "./utils";

describe("formatDuration", () => {
    it("formats seconds to mm:ss", () => {
        expect(formatDuration(65)).toBe("1:05");
        expect(formatDuration(245)).toBe("4:05");
    });

    it("handles undefined input", () => {
        expect(formatDuration(undefined)).toBe("");
    });
});
```

### Component Testing

Test component behavior with Lit testing utilities:

```typescript
// kodi-playlist-card.test.ts
import { fixture, html } from "@open-wc/testing";
import { KodiPlaylistCard } from "./kodi-playlist-card";

describe("KodiPlaylistCard", () => {
    it("renders when hass is available", async () => {
        const element = await fixture(html`<kodi-playlist-card></kodi-playlist-card>`);
        expect(element).to.exist;
    });

    it("sets config without throwing", () => {
        const element = new KodiPlaylistCard();
        expect(() => {
            element.setConfig({ entry_id: "test" });
        }).to.not.throw();
    });
});
```

## Adding Phase 2 Features

### Feature: Play Button

#### File: `src/features/play-button.ts`
```typescript
/**
 * Handles triggering track playback
 */
export class PlayButtonController {
    constructor(private hass: HomeAssistant, private entryId: string) {}

    async playTrack(index: number): Promise<void> {
        // Implementation
    }
}
```

#### File: `src/kodi-playlist-card.ts`
```typescript
// Add import
import { PlayButtonController } from "./features/play-button";

export class KodiPlaylistCard extends LitElement {
    private _playButtonController?: PlayButtonController;

    private _initializePlayButton(): void {
        if (this._config) {
            this._playButtonController = new PlayButtonController(
                this.hass,
                this._config.entry_id
            );
        }
    }

    // Add to render method
    private _renderPlayButton(index: number): TemplateResult {
        return html`
            <button @click=${() => this._playButtonController?.playTrack(index)}>
                <ha-icon icon="mdi:play"></ha-icon>
            </button>
        `;
    }
}
```

### Feature: Drag & Drop

#### File: `src/features/drag-drop.ts`
```typescript
/**
 * Manages drag and drop reordering
 */
export class DragDropController {
    constructor(
        private hass: HomeAssistant,
        private entryId: string,
        private onReorder: (from: number, to: number) => void
    ) {}

    handleDragStart(event: DragEvent, index: number): void { }
    handleDragOver(event: DragEvent): void { }
    handleDrop(event: DragEvent, targetIndex: number): void { }
}
```

### Feature: Card Editor

#### File: `src/editor/editor.ts`
```typescript
/**
 * Card configuration editor UI
 */
@customElement("kodi-playlist-card-editor")
export class KodiPlaylistCardEditor extends LitElement {
    @property() config?: KodiPlaylistCardConfig;
    @state() _entryId?: string;

    // Editor implementation
}
```

#### Register editor in main component:
```typescript
export const getConfigElement = () => new KodiPlaylistCardEditor();
```

## Performance Optimization

### 1. Minimize Re-renders

```typescript
// ❌ BAD: Re-renders entire list on any state change
protected render() {
    return html`
        <ul>
            ${this._items.map((item, index) => this._renderItem(item, index))}
        </ul>
    `;
}

// ✅ GOOD: Use @repeat directive for large lists
import { repeat } from "lit/directives/repeat.js";

protected render() {
    return html`
        <ul>
            ${repeat(
                this._items,
                (item) => item.title,  // Key function
                (item, index) => this._renderItem(item, index)
            )}
        </ul>
    `;
}
```

### 2. Lazy Load Large Lists

```typescript
// For large playlists, use virtualization
import { virtualize } from "@lit-labs/virtualizer";

private _renderContent(): TemplateResult {
    return html`
        <div class="playlist-container">
            ${virtualize({
                items: this._items,
                renderItem: (item, index) => this._renderItem(item, index),
            })}
        </div>
    `;
}
```

### 3. Debounce Event Handlers

```typescript
private _debouncedSearch = debounce(
    (query: string) => this._search(query),
    300
);

private _handleSearchInput(event: Event): void {
    const query = (event.target as HTMLInputElement).value;
    this._debouncedSearch(query);
}

// Helper function
function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return function executedFunction(...args: Parameters<T>) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
```

## Error Handling

### 1. Validation

```typescript
// ✅ GOOD: Validate early
public setConfig(config: any): void {
    try {
        this._config = validateConfig(config);
    } catch (error) {
        this._error = error instanceof Error ? error.message : "Invalid config";
        throw error;
    }
}
```

### 2. Graceful Degradation

```typescript
// ✅ GOOD: Show placeholder when data missing
private _renderPlaylistItem(item: PlaylistItem): TemplateResult {
    return html`
        <li class="playlist-item">
            ${isValidThumbnail(item.thumbnail)
                ? html`<img src="${item.thumbnail}" alt="${item.title}" />`
                : html`<div class="thumbnail-placeholder">
                      <ha-icon icon="mdi:music-box-outline"></ha-icon>
                  </div>`}
        </li>
    `;
}
```

### 3. Error Boundaries

```typescript
// ✅ GOOD: Catch and handle errors gracefully
private _handlePlaylistEvent(event: KodiMediaSensorEvent): void {
    try {
        if (event.type === "playlist_update") {
            this._items = event.items || [];
            this._connectionState = ConnectionState.CONNECTED;
        }
    } catch (error) {
        console.error("Error processing event:", error);
        this._connectionState = ConnectionState.ERROR;
        this._error = "Failed to process playlist update";
    }
}
```

## Logging & Debugging

### 1. Console Logging Strategy

```typescript
// ✅ GOOD: Clear, informative logs
private _subscribeToPlaylistUpdates(): void {
    console.log("[KodiPlaylistCard] Subscribing to updates for:", this._config?.entry_id);
    
    try {
        // ...
        console.log("[KodiPlaylistCard] Subscription successful");
    } catch (error) {
        console.error("[KodiPlaylistCard] Subscription failed:", error);
    }
}
```

### 2. Debug Mode

```typescript
// Optional debug mode for development
private readonly _debug = true;

private _log(message: string, data?: any): void {
    if (this._debug) {
        console.log(`[KodiPlaylistCard] ${message}`, data);
    }
}
```

## Code Review Checklist

Before committing:

- [ ] **Types**: All functions have proper TypeScript types
- [ ] **Comments**: Complex logic is documented
- [ ] **Naming**: Clear, descriptive names (not `a`, `b`, `temp`)
- [ ] **Organization**: Related code grouped together
- [ ] **DRY**: No duplicated code
- [ ] **Performance**: No unnecessary re-renders
- [ ] **Error Handling**: Graceful failures with clear messages
- [ ] **Accessibility**: Keyboard navigation, ARIA labels
- [ ] **Responsive**: Works on mobile and desktop
- [ ] **Clean**: No console errors or warnings
- [ ] **Tested**: Changes tested locally
- [ ] **Documentation**: Updated relevant docs

## Release Checklist

Before releasing a new version:

- [ ] All tests pass
- [ ] No console errors
- [ ] Build succeeds without warnings
- [ ] Updated CHANGELOG.md
- [ ] Updated version in package.json
- [ ] Tested on multiple browsers
- [ ] Tested on mobile devices
- [ ] Documentation updated if needed
- [ ] Created GitHub release with notes
- [ ] Pushed to HACS if applicable

## Resources

- [Lit Documentation](https://lit.dev/)
- [Home Assistant Custom Card Development](https://developers.home-assistant.io/docs/frontend/custom-ui/custom-card/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [SASS Documentation](https://sass-lang.com/documentation)
- [Web Components Best Practices](https://www.webcomponents.org/articles/web-components-best-practices/)
