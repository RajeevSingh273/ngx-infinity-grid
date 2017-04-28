import {
	ElementRef,
	Input,
	HostListener,
	Component,
	OnInit,
	ViewEncapsulation,
	Renderer2
} from "@angular/core";

import {
	InfinityDataSource,
	IDataSourceRow
} from "./infinity-data-source.service";

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
							<template [ngIf]="item.hasValue()">
								{{ item.getValue() }}
							</template>
							<template [ngIf]="!item.hasValue()">
								<span class="infinity-table-cell-loading">{{ loadingMessage }}</span>
							</template>
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
	private static MAX_HEIGHT_BY_BROWSER_RESTRICTION: number = 1533729;

	@Input() dataSource: InfinityDataSource<any>;
	@Input() loadingMessage: string;
	@Input() preventLoadPageAfterViewInit: boolean;
	@Input() delayOnChangeViewState: number;

	private _scrollableContainerWrapper: HTMLElement;
	private _scrollableContainer: HTMLElement;
	private _rowHeight: number;
	private _loadTask: number;
	private _selectedRowIndex: number;

	constructor(private el: ElementRef, private renderer: Renderer2) {
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

		this.refreshScrollableContainerHeight();

		// Determining of a row height automatically
		const nullRow: HTMLElement = this._scrollableContainer.children[0] as HTMLElement;
		this._rowHeight = nullRow.clientHeight;

		console.debug('[$InfinityTable] The row height has been calculated automatically:', this._rowHeight);
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
		if (this.getDataSourceFullSize() === item.getFirstPosition() + this.getPageSize()) {
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
		const lastDataSourceIndex: number = dataSourceFullSize - 1;

		let startIndex: number = Math.floor(scrollPosition / this.getAdjustedRowHeight());
		let endIndex: number = startIndex + pageSize - 1;

		if (dataSourceFullSize > 0) {
			endIndex = Math.min(endIndex, lastDataSourceIndex);
		}

		if (scrollPosition > 0
			&& this.getScrollableContainerActualFullHeight() - scrollPosition === this.getScrollableContainerWrapperFullHeight()) {

			/**
			 * This is the last page and we must adjust the indexes because browser restrictions
			 */
			endIndex = Math.max(lastDataSourceIndex, endIndex);

			// when we do adjusting then we don't take into consideration the south page zone size
			startIndex = endIndex - pageSize + InfinityTable.SOUTH_PAGE_ZONE_SIZE;
		}

		console.debug('[$InfinityTable] Start index is', startIndex, ', end index is', endIndex);
		return [startIndex, endIndex];
	}

	private launchUpdateView() {
		if (this._loadTask) {
			clearTimeout(this._loadTask);
			this._loadTask = null;
		}

		if (this.isDataSourcePageReady()) {
			this.applyDataSourcePage();

			console.debug('[$InfinityTable] The data source page has been applied immediately');
			return;
		}

		this._loadTask = setTimeout(() => {
			this.applyDataSourcePage();

			console.debug('[$InfinityTable] The data source page has been applied');

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
		return this._rowHeight * this.getAdjustedRowHeightFactor();
	}

	/**
	 * http://stackoverflow.com/questions/7719273/determine-maximum-possible-div-height
	 */
	private getAdjustedRowHeightFactor(): number {
		return this.getScrollableContainerActualFullHeight() / this.getScrollableContainerFullHeight();
	}

	private getScrollableContainerActualFullHeight(): number {
		return this._scrollableContainer.clientHeight;
	}

	private getScrollableContainerWrapperFullHeight(): number {
		return this._scrollableContainerWrapper.clientHeight;
	}

	private refreshScrollableContainerHeight(): void {
		this.renderer.setStyle(this._scrollableContainer, 'height',
			this.getScrollableContainerFullHeight() + 'px');

		if (this.getScrollableContainerActualFullHeight() === 0) {
			// Browser has been failed to set height
			this.renderer.setStyle(this._scrollableContainer, 'height',
				InfinityTable.MAX_HEIGHT_BY_BROWSER_RESTRICTION + 'px');

			console.debug('[$InfinityTable] Browser has been failed to set height');
		}
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

	private applyDataSourcePage() {
		const indexes: number[] = this.getStartEndIndexes();
		this.dataSource.fetch(indexes[0], indexes[1]);
	}

	@HostListener('scroll')
	private onScroll() {
		this.launchUpdateView();
	}

	@HostListener('window:resize')
	private resizeHandler() {
		this.launchUpdateView();
	}
}

declare function setTimeout(callback: (...args: any[]) => void, ms: number, ...args: any[]): number;