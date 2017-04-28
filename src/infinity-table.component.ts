import {
	ElementRef,
	Input,
	HostListener,
	Component,
	OnInit,
	ViewEncapsulation,
	Renderer2,
	Inject
} from "@angular/core";

import {
	InfinityDataSource,
	IDataSourceRow
} from "./infinity-data-source.service";

import {INFINITY_GRID_DEBUG_ENABLED} from "./infinity-grid.settings";

@Component({
	selector: 'InfinityTable',
	template: `
			<div class="infinity-table-container">
				<div class="infinity-table-row infinity-table-null-row">
					<div class="infinity-table-cell" style="width: 100px;">&nbsp;</div>
				</div>
				<div class="infinity-table-row"
					*ngFor="let item of dataSource" 
					(click)="onRowClick(item)"
					[ngClass]="{selected: isRowSelected(item)}"
					[ngStyle]="{top: buildTopItem(item) + 'px'}">
						<div class="infinity-table-cell" style="width: 100px;">
							<ng-template [ngIf]="item.hasValue()">
								{{ item.getValue() }}
							</ng-template>
							<ng-template [ngIf]="!item.hasValue()">
								<span class="infinity-table-cell-loading">{{ loadingMessage }}</span>
							</ng-template>
						</div>
				</div>
			</div>
		`,
	styles: [
		`
			infinitytable {
			    width: 100%;
			    height: 100%;
			    display: block;
			    overflow: auto;
			    cursor: default;
			}
			
			.infinity-table-container {
			    width: 100%;
			    position: relative;
			}
			
			.infinity-table-container .infinity-table-row {
			    width: 100%;
			    position: absolute;
			    cursor: pointer;
			}
			
			.infinity-table-container .infinity-table-row.selected .infinity-table-cell {
			    background-color: #99dde5;
			}
			
			.infinity-table-container .infinity-table-null-row {
			    visibility: hidden;
			}
			
			.infinity-table-container .infinity-table-cell {
			    overflow: hidden;
			    border-right: 1px dotted #808080;
			    border-top: 1px transparent;
			    border-bottom: 1px transparent;
			    padding: 4px;
			}
		`
	],
	encapsulation: ViewEncapsulation.None,
})
export class InfinityTable implements OnInit {

	private static SOUTH_PAGE_ZONE_SIZE: number = 1;
	private static NORTH_PAGE_ZONE_SIZE: number = 1;

	// http://stackoverflow.com/questions/28260889/set-large-value-to-divs-height
	private static MAX_HEIGHTS_BY_BROWSER_RESTRICTION: number[] = [20000000, 17895696, 1533917];

	@Input() dataSource: InfinityDataSource<any>;
	@Input() loadingMessage: string;
	@Input() preventLoadPageAfterViewInit: boolean;
	@Input() delayOnChangeViewState: number;

	private _scrollableContainerWrapper: HTMLElement;
	private _scrollableContainer: HTMLElement;
	private _rowHeight: number;
	private _adjustedRowHeight: number;                     // Cached for optimization
	private _adjustedRowHeightFactor: number;               // Cached for optimization
	private _loadTask: number;
	private _selectedRowIndex: number;
	private _needAdjustScrollableContainerHeight: boolean;  // Cached for optimization

	constructor(private el: ElementRef,
	            private renderer: Renderer2,
	            @Inject(INFINITY_GRID_DEBUG_ENABLED) private debugEnabled: boolean) {
	}

	/**
	 * @override
	 */
	public ngOnInit() {
		this.delayOnChangeViewState = this.delayOnChangeViewState || 100;
		this.loadingMessage = this.loadingMessage || 'Loading...';
		this.preventLoadPageAfterViewInit = this.preventLoadPageAfterViewInit || false;

		this._scrollableContainerWrapper = this.el.nativeElement;
		this._scrollableContainer = this.el.nativeElement.children[0] as HTMLElement;

		// Determining of a row height automatically
		const nullRow: HTMLElement = this._scrollableContainer.children[0] as HTMLElement;
		this._rowHeight = nullRow.clientHeight;

		this.refreshScrollableContainerHeight();

		if (this.debugEnabled) {
			console.debug('[$InfinityTable] The row height has been calculated automatically:', this._rowHeight);
		}
	}

	/**
	 * @override
	 */
	public ngAfterViewInit() {
		if (!this.preventLoadPageAfterViewInit) {
			this.applyDataSourcePage();
		}
	}

	/**
	 * @template
	 */
	private onRowClick(item: IDataSourceRow<any>) {
		this._selectedRowIndex = item.getPosition();
	}

	/**
	 * @template
	 */
	private isRowSelected(item: IDataSourceRow<any>) {
		return item.getPosition() === this._selectedRowIndex;
	}

	/**
	 * @template
	 */
	private buildTopItem(item: IDataSourceRow<any>) {
		if (this._needAdjustScrollableContainerHeight &&
			this.getDataSourceFullSize() === item.getFirstPosition() + this.getPageSize()) {
			// Adjust top height because the last page
			return this.getScrollableContainerActualFullHeight() -
				this._rowHeight * (this.getDataSourceFullSize() - item.getPosition());
		} else {
			const topStartPosition: number = item.getFirstPosition() * this.getAdjustedRowHeight();
			return topStartPosition + this._rowHeight * (item.getPosition() - item.getFirstPosition());
		}
	}

	private getStartEndIndexes(): number[] {
		const dataSourceFullSize: number = this.dataSource.getFullSize();
		const scrollPosition: number = this._scrollableContainerWrapper.scrollTop;
		const pageSize: number = this.getPageSize();
		const scrollableContainerActualFullHeight: number = this.getScrollableContainerActualFullHeight();
		const scrollableContainerWrapperFullHeight:number = this.getScrollableContainerWrapperFullHeight();
		const lastDataSourceIndex: number = dataSourceFullSize - 1;

		let startIndex: number = Math.floor(scrollPosition / this.getAdjustedRowHeight());
		let endIndex: number = startIndex + pageSize - 1;

		if (dataSourceFullSize > 0) {
			endIndex = Math.min(endIndex, lastDataSourceIndex);
		}

		let scrollPositionDiff: number = -1;
		if (this._needAdjustScrollableContainerHeight
			&& scrollPosition > 0
			&& ((scrollPositionDiff = scrollableContainerActualFullHeight - scrollPosition) === scrollableContainerWrapperFullHeight)) {

			/**
			 * This is the last page and we must adjust the indexes because browser restrictions
			 */
			endIndex = Math.max(lastDataSourceIndex, endIndex);

			// when we do adjusting then we don't take into consideration the south page zone size
			startIndex = endIndex - pageSize + InfinityTable.SOUTH_PAGE_ZONE_SIZE;
		}

		if (this.debugEnabled) {
			console.debug('[$InfinityTable] Start index is', startIndex,
				', end index is', endIndex,
				', _needAdjustScrollableContainerHeight is', this._needAdjustScrollableContainerHeight,
				', adjustedRowHeight is', this.getAdjustedRowHeight(),
				', adjustedRowHeightFactor is', this.getAdjustedRowHeightFactor(),
				', scrollPosition is', scrollPosition,
				', pageSize is', pageSize,
				', scrollableContainerActualFullHeight is', scrollableContainerActualFullHeight,
				', scrollPositionDiff is', scrollPositionDiff,
				', scrollableContainerWrapperFullHeight is', scrollableContainerWrapperFullHeight);
		}

		return [startIndex, endIndex];
	}

	private launchUpdateView() {
		if (this._loadTask) {
			clearTimeout(this._loadTask);
			this._loadTask = null;
		}

		if (this.isDataSourcePageReady()) {
			this.applyDataSourcePage();

			if (this.debugEnabled) {
				console.debug('[$InfinityTable] The data source page has been applied immediately');
			}
			return;
		}

		this._loadTask = setTimeout(() => {
			this.applyDataSourcePage();

			if (this.debugEnabled) {
				console.debug('[$InfinityTable] The data source page has been applied');
			}

			this._loadTask = null;
		}, this.delayOnChangeViewState);
	}

	private getDataSourceFullSize(): number {
		return this.dataSource.getFullSize();
	}

	private getPageSize(): number {
		return Math.floor(this.getScrollableContainerWrapperFullHeight() / this._rowHeight)
			/** Full filled for border zone: north zone and south zone **/
			+ InfinityTable.SOUTH_PAGE_ZONE_SIZE + InfinityTable.NORTH_PAGE_ZONE_SIZE;
	}

	private getAdjustedRowHeight(): number {
		return this._adjustedRowHeight = this._adjustedRowHeight
			|| this._rowHeight * this.getAdjustedRowHeightFactor(); // _rowHeight is immutable
	}

	private getAdjustedRowHeightFactor(): number {
		return this._needAdjustScrollableContainerHeight
			? this._adjustedRowHeightFactor = this._adjustedRowHeightFactor || (this.getScrollableContainerActualFullHeight() / this.getScrollableContainerFullHeight())
			: 1;    // For optimization
	}

	private getScrollableContainerActualFullHeight(): number {
		return this._scrollableContainer.clientHeight;
	}

	private getScrollableContainerWrapperFullHeight(): number {
		return this._scrollableContainerWrapper.clientHeight;
	}

	private refreshScrollableContainerHeight(): void {
		this._adjustedRowHeight = null;                         // reset the cached value
		this._adjustedRowHeightFactor = null;                   // reset the cached value
		this._needAdjustScrollableContainerHeight = false;      // reset the cached value

		const scrollableContainerFullHeight: number = this.getScrollableContainerFullHeight();
		this.renderer.setStyle(this._scrollableContainer, 'height', scrollableContainerFullHeight + 'px');

		if (!this.isValidScrollableContainerActualFullHeight(scrollableContainerFullHeight)) {
			// Browser has been failed to set height
			// Trying to set most large height
			this._needAdjustScrollableContainerHeight = true;

			if (this.debugEnabled) {
				console.debug('[$InfinityTable] Browser has been failed to set height', scrollableContainerFullHeight);
			}

			for (let restrictionHeight of InfinityTable.MAX_HEIGHTS_BY_BROWSER_RESTRICTION) {
				this.renderer.setStyle(this._scrollableContainer, 'height', restrictionHeight + 'px');

				if (!this.isValidScrollableContainerActualFullHeight(restrictionHeight)) {
					if (this.debugEnabled) {
						console.debug('[$InfinityTable] Browser has been failed to set restriction height', restrictionHeight);
					}
				} else {
					if (this.debugEnabled) {
						console.debug('[$InfinityTable] Browser has been succeeded to set restriction height', restrictionHeight);
					}
					break;
				}
			}
		} else {
			if (this.debugEnabled) {
				console.debug('[$InfinityTable] Browser has been succeeded to set height', scrollableContainerFullHeight);
			}
		}
	}

	private isValidScrollableContainerActualFullHeight(preassignedHeight: number): boolean {
		const scrollableContainerActualFullHeight: number = this.getScrollableContainerActualFullHeight();
		return scrollableContainerActualFullHeight > 0 && preassignedHeight === scrollableContainerActualFullHeight;
	}

	/**
	 * @template
	 */
	private getScrollableContainerFullHeight(): number {
		return Math.max(
			this.dataSource.getFullSize() * this._rowHeight,
			this.getScrollableContainerWrapperFullHeight()
		);
	}

	private isDataSourcePageReady(): boolean {
		const indexes: number[] = this.getStartEndIndexes();
		return this.dataSource.isFetched(indexes[0], indexes[1]);
	}

	private applyDataSourcePage(): Promise<void> {
		const indexes: number[] = this.getStartEndIndexes();

		return this.dataSource.fetch(indexes[0], indexes[1])
			.then(() => this.refreshScrollableContainerHeight());
	}

	@HostListener('scroll', ['$event'])
	private onScroll(event: Event) {
		this.launchUpdateView();
	}

	@HostListener('window:resize')
	private resizeHandler() {
		this.launchUpdateView();
	}
}

declare function setTimeout(callback: (...args: any[]) => void, ms: number, ...args: any[]): number;