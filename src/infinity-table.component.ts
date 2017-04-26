import {
	ElementRef,
	Input,
	HostListener,
	Component,
	Renderer,
	OnInit,
	ViewEncapsulation
} from "@angular/core";

import {
	InfinityDataSource,
	IDataSourceRow
} from "./infinity-data-source";

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
	styleUrls: [
		'./infinity-table.component.css'
	],
	encapsulation: ViewEncapsulation.None,
})
export class InfinityTable implements OnInit {

	@Input() dataSource: InfinityDataSource<any>;
	@Input() loadingMessage: string;
	@Input() preventLoadPageAfterViewInit: boolean;
	@Input() debugModeDisabled: boolean;
	@Input() delayOnChangeViewState: number;

	private _scrollableContainerWrapper: HTMLElement;
	private _rowHeight: number;
	private _loadTask: number;
	private _selectedRowIndex: number;

	constructor(private el: ElementRef, private renderer: Renderer) {
	}

	/**
	 * @override
	 */
	public ngOnInit() {
		this.delayOnChangeViewState = this.delayOnChangeViewState || 100;
		this.loadingMessage = this.loadingMessage || 'Loading...';
		this.debugModeDisabled = this.debugModeDisabled || false;
		this.preventLoadPageAfterViewInit = this.preventLoadPageAfterViewInit || false;

		this._scrollableContainerWrapper = this.el.nativeElement;
		const _scrollableContainer: HTMLElement = this.el.nativeElement.children[0] as HTMLElement;

		// Determining of a row height automatically
		const nullRow: HTMLElement = _scrollableContainer.children[0] as HTMLElement;
		this._rowHeight = nullRow.clientHeight;

		this.renderer.setElementStyle(_scrollableContainer, 'height', this.getScrollableContainerFullHeight() + 'px');
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

	protected getScrollableContainerFullHeight(): number {
		return this.dataSource.getLength() * this._rowHeight;
	}

	protected getStartEndIndexes(): number[] {
		const position = this._scrollableContainerWrapper.scrollTop;
		const reserveSize: number = 0;

		let startIndex = Math.floor(position / this._rowHeight);
		let endIndex = Math.floor((position + this._scrollableContainerWrapper.clientHeight) / this._rowHeight);

		startIndex = Math.max(startIndex - reserveSize, 0);
		endIndex = Math.min(endIndex + reserveSize, this.dataSource.getLength() - 1);

		if (!this.debugModeDisabled) {
			console.debug('[$InfinityComponent] Start index is', startIndex, ', end index is', endIndex);
		}
		return [startIndex, endIndex];
	}

	private launchUpdateView() {
		if (this._loadTask) {
			clearTimeout(this._loadTask);
		}

		this._loadTask = setTimeout(() => {
			this._loadTask = null;
			this.applyDataSourcePage();

			if (!this.debugModeDisabled) {
				console.debug('[$InfinityComponent] A new data source page has been applied');
			}
		}, this.delayOnChangeViewState);
	}

	private applyDataSourcePage() {
		const indexes: number[] = this.getStartEndIndexes();
		this.dataSource.applyRange(indexes[0], indexes[1]);
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
