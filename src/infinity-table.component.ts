import {
	ElementRef,
	Input,
	HostListener,
	Component,
	OnInit,
	ViewEncapsulation
} from "@angular/core";

import {
	InfinityDataSource,
	IDataSourceRow
} from "./infinity-data-source.service";

@Component({
	selector: 'InfinityTable',
	template: `
			<div class="infinity-table-container"
				[ngStyle]="{height: getScrollableContainerFullHeight() + 'px'}">
					<div class="infinity-table-row infinity-table-null-row">
						<div class="infinity-table-cell" style="width: 100px;">&nbsp;</div>
					</div>
					<div class="infinity-table-row"
						*ngFor="let item of dataSource" 
						(click)="onRowClick(item)"
						[ngClass]="{selected: isRowSelected(item)}"
						[ngStyle]="{top: toTopItem(item.getPosition()) + 'px', visibility: isContainerReady() ? 'visible' : 'hidden'}">
							<div class="infinity-table-cell" style="width: 100px;">
								{{ item.getValue() }}
							</div>
					</div>
			</div>
			<div class="infinity-table-progressbar"
				[ngStyle]="{display: isContainerReady() ? 'none' : 'block'}">
					<div class="infinity-table-progressbar-inner">{{ loadingMessage }}</div>
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
			
			.infinity-table-progressbar {
			    position: absolute;
			    left: 50%;
			    top: 50%;
			}
			
			.infinity-table-progressbar .infinity-table-progressbar-inner {
			    position: relative;
			    left: -50%;
			}
		`
	],
	encapsulation: ViewEncapsulation.None,
})
export class InfinityTable implements OnInit {

	@Input() dataSource: InfinityDataSource<any>;
	@Input() loadingMessage: string;
	@Input() preventLoadPageAfterViewInit: boolean;
	@Input() delayOnChangeViewState: number;

	private _scrollableContainerWrapper: HTMLElement;
	private _rowHeight: number;
	private _loadTask: number;
	private _selectedRowIndex: number;

	constructor(private el: ElementRef) {
	}

	/**
	 * @override
	 */
	public ngOnInit() {
		this.delayOnChangeViewState = this.delayOnChangeViewState || 100;
		this.loadingMessage = this.loadingMessage || 'Loading...';
		this.preventLoadPageAfterViewInit = this.preventLoadPageAfterViewInit || false;

		this._scrollableContainerWrapper = this.el.nativeElement;
		const _scrollableContainer: HTMLElement = this.el.nativeElement.children[0] as HTMLElement;

		// Determining of a row height automatically
		const nullRow: HTMLElement = _scrollableContainer.children[0] as HTMLElement;
		this._rowHeight = nullRow.clientHeight;
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
	protected onRowClick(item: IDataSourceRow<any>) {
		this._selectedRowIndex = item.getPosition();
	}

	/**
	 * @template
	 */
	protected isRowSelected(item: IDataSourceRow<any>) {
		return item.getPosition() === this._selectedRowIndex;
	}

	/**
	 * @template
	 */
	protected isContainerReady(): boolean {
		return this.dataSource.isReady() && !this._loadTask;
	}

	/**
	 * @template
	 */
	protected toTopItem(position: number) {
		return this._rowHeight * position;
	}

	protected getScrollableContainerWrapperFullHeight(): number {
		return this._scrollableContainerWrapper.clientHeight;
	}

	/**
	 * @template
	 */
	protected getScrollableContainerFullHeight(): number {
		return Math.max(
			this.dataSource.getFullSize() * this._rowHeight,
			this.getScrollableContainerWrapperFullHeight()
		);
	}

	protected getStartEndIndexes(): number[] {
		const position: number = this._scrollableContainerWrapper.scrollTop;

		let startIndex: number = Math.floor(position / this._rowHeight);
		let endIndex: number = Math.floor((position + this.getScrollableContainerWrapperFullHeight()) / this._rowHeight);

		const dataSourceFullSize: number = this.dataSource.getFullSize();
		if (dataSourceFullSize > 0) {
			endIndex = Math.min(endIndex, dataSourceFullSize - 1);
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
			this._loadTask = null;
			this.applyDataSourcePage();

			console.debug('[$InfinityTable] The data source page has been applied');
		}, this.delayOnChangeViewState);
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