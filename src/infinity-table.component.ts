import {
	ElementRef,
	Input,
	Output,
	HostListener,
	Component,
	OnInit,
	OnChanges,
	ViewEncapsulation,
	Renderer2,
	Inject,
	EventEmitter,
	SimpleChanges
} from '@angular/core';

import {
	InfinityDataSource,
	IDataSourceRow,
	InfinityPage,
	InfinityPageData
} from './infinity-data-source.service';

import {INFINITY_GRID_DEBUG_ENABLED} from './infinity-grid.settings';

@Component({
	selector: 'InfinityTable',
	template: `
			<div class="infinity-table-container">
				<div class="infinity-table-row infinity-table-null-row">
					<div class="infinity-table-cell" style="width: 100px;">&nbsp;</div>
				</div>
				<ng-template [ngIf]="!bodyMessage">
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
				</ng-template>
			</div>
			<div class="infinity-table-message" 
				*ngIf="bodyMessage">
				<div class="infinity-table-message-inner">{{ bodyMessage }}</div>
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
			
			.infinity-table-message {
			    position: absolute;
			    left: 50%;
			    top: 50%;
			}
			
			.infinity-table-message .infinity-table-message-inner {
			    position: relative;
			    left: -50%;
			}
		`
	],
	encapsulation: ViewEncapsulation.None,
})
export class InfinityTable implements OnInit, OnChanges {

	private static SOUTH_PAGE_ZONE_SIZE: number = 1;
	private static NORTH_PAGE_ZONE_SIZE: number = 1;

	// http://stackoverflow.com/questions/28260889/set-large-value-to-divs-height
	private static MAX_HEIGHTS_BY_BROWSER_RESTRICTION: number[] = [20000000, 17895696, 1533917];

	@Input() pageData: InfinityPageData<any>;
	@Input() loadingMessage: string;
	@Input() emptyMessage: string;
	@Input() preventLoadPageAfterViewInit: boolean;
	@Input() delayOnChangeViewState: number;
	@Output() fetchPage: EventEmitter<InfinityPage> = new EventEmitter<InfinityPage>(false);

	private _scrollableContainerWrapper: HTMLElement;
	private _scrollableContainer: HTMLElement;
	private _rowHeight: number;
	private _adjustedRowHeight: number;                     // Cached for optimization
	private _adjustedRowHeightFactor: number;               // Cached for optimization
	private _loadTask: number;
	private _selectedRowIndex: number;
	private _needAdjustScrollableContainerHeight: boolean;  // Cached for optimization

	private bodyMessage: string;
	private dataSource: InfinityDataSource<any>;

	constructor(private el: ElementRef,
	            private renderer: Renderer2,
	            @Inject(InfinityDataSource) dataSourceCtor: Function,
	            @Inject(INFINITY_GRID_DEBUG_ENABLED) private debugEnabled: boolean) {
		this.dataSource = Reflect.construct(dataSourceCtor, [debugEnabled]);
	}

	/**
	 * @override
	 */
	public ngOnInit() {
		this.delayOnChangeViewState = this.delayOnChangeViewState || 50;
		this.loadingMessage = this.loadingMessage || 'Loading...';
		this.emptyMessage = this.emptyMessage || 'Nothing is loaded';
		this.preventLoadPageAfterViewInit = this.preventLoadPageAfterViewInit || false;

		this._scrollableContainerWrapper = this.el.nativeElement;
		this._scrollableContainer = this.el.nativeElement.children[0] as HTMLElement;

		// Determining of a row height automatically
		const nullRow: HTMLElement = this._scrollableContainer.children[0] as HTMLElement;
		this._rowHeight = nullRow.clientHeight;

		if (this.debugEnabled) {
			console.debug('[$InfinityTable] The row height has been calculated automatically:', this._rowHeight);
		}

		this.bodyMessage = this.emptyMessage;
	}

	/**
	 * @override
	 */
	public ngOnChanges(changes: SimpleChanges) {
		if (changes.pageData && this.pageData) {
			if (Object.keys(this.pageData).length === 0) {

				// When the user launches first loading manually
				this._scrollableContainerWrapper.scrollTop = 0;
				this.dataSource.clearAll();

				this.applyNewPage();
			} else {
				if (this.pageData.rawData) {
					this.bodyMessage = null;
				}

				this.dataSource.setPageData(this.pageData);

				if (this.debugEnabled) {
					console.debug('[$InfinityTable] The page data have been updated:', this.pageData);
				}
				this.refreshScrollableContainerHeight();
			}
		}
	}

	/**
	 * @override
	 */
	public ngAfterViewInit() {
		if (!this.preventLoadPageAfterViewInit) {
			this.applyNewPage();
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
		const dataSourceTotalLength: number = this.dataSource.getTotalLength();
		const scrollPosition: number = this._scrollableContainerWrapper.scrollTop;
		const pageSize: number = this.getPageSize();
		const scrollableContainerActualFullHeight: number = this.getScrollableContainerActualFullHeight();
		const scrollableContainerWrapperFullHeight:number = this.getScrollableContainerWrapperFullHeight();
		const lastDataSourceIndex: number = dataSourceTotalLength - 1;

		let startIndex: number = Math.floor(scrollPosition / this.getAdjustedRowHeight());
		let endIndex: number = startIndex + pageSize - 1;

		if (dataSourceTotalLength > 0) {
			endIndex = Math.min(endIndex, lastDataSourceIndex);
		}

		if (this._needAdjustScrollableContainerHeight
			&& scrollPosition > 0
			&& ((scrollableContainerActualFullHeight - scrollPosition) === scrollableContainerWrapperFullHeight)) {

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
				', scrollableContainerWrapperFullHeight is', scrollableContainerWrapperFullHeight);
		}

		return [startIndex, endIndex];
	}

	private refreshView() {
		if (this._loadTask) {
			clearTimeout(this._loadTask);
			this._loadTask = null;
		}

		if (this.isPageReady()) {
			this.applyNewPage();

			if (this.debugEnabled) {
				console.debug('[$InfinityTable] The data source page has been applied immediately');
			}
			return;
		}

		this._loadTask = setTimeout(() => {
			this.applyNewPage();

			if (this.debugEnabled) {
				console.debug('[$InfinityTable] The data source page has been applied');
			}

			this._loadTask = null;
		}, this.delayOnChangeViewState);
	}

	private getDataSourceFullSize(): number {
		return this.dataSource.getTotalLength();
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
			this.dataSource.getTotalLength() * this._rowHeight,
			this.getScrollableContainerWrapperFullHeight()
		);
	}

	private isPageReady(): boolean {
		const indexes: number[] = this.getStartEndIndexes();
		return this.dataSource.isPageReady(indexes[0], indexes[1]);
	}

	private applyNewPage() {
		const indexes: number[] = this.getStartEndIndexes();
		const startIndex: number = indexes[0];
		const endIndex: number = indexes[1];

		const infinityPage: InfinityPage = {
			startIndex: startIndex,
			endIndex: endIndex,
			isReady: this.dataSource.isPageReady(startIndex, endIndex)
		};

		if (this.dataSource.getTotalLength() === 0) {
			this.bodyMessage = this.loadingMessage;
		}

		// Flux-cycle is started here
		this.fetchPage.emit(infinityPage);
	}

	@HostListener('scroll', ['$event'])
	private onScroll() {
		this.refreshView();
	}

	@HostListener('window:resize')
	private resizeHandler() {
		this.refreshView();
	}
}

declare function setTimeout(callback: (...args: any[]) => void, ms: number, ...args: any[]): number;
