export interface InfinityPage {
	startIndex: number;
	endIndex: number;
	isReady: boolean;
}

export interface InfinityPageData<T> {
	startIndex?: number;
	endIndex?: number;
	totalLength?: number;
	rawData?: T[];
}

export abstract class InfinityDataSource<T> {
	abstract getTotalLength(): number;
	abstract isPageReady(startIndex: number, endIndex: number): boolean;
	abstract setPageData(page: InfinityPageData<T>);
	abstract clearAll();
}

export class DefaultInfinityDataSource<T> extends InfinityDataSource<T> {

	/**
	 * ES6 iterators compatibility
	 * @override
	 */
	[Symbol.iterator] = this.iterator();

	private _dataBuffer: T[];
	private _startIndex: number;
	private _endIndex: number;

	constructor(private debugEnabled: boolean) {
		super();
	}

	/**
	 * @override
	 */
	public clearAll() {
		this._dataBuffer = null;
		this._startIndex = null;
		this._endIndex = null;
	}

	/**
	 * @override
	 */
	public setPageData(pageData: InfinityPageData<T>) {
		this._startIndex = pageData.startIndex;

		if (Object.keys(pageData).length === 2 &&
			typeof pageData.startIndex !== 'undefined' &&
			typeof pageData.endIndex !== 'undefined') {

			// Case #3. This section should be executed before fetch of the remote data because we must show the loading of rows
			this._endIndex = pageData.endIndex;

			if (this.debugEnabled) {
				console.debug('[$DefaultInfinityDataSource] The page has been applied. Start index is', this._startIndex,
					', end index is', this._endIndex
				);
			}
		} else {
			// Case #4. This section should be executed when fetch of the remote data has been succeeded
			this._endIndex = pageData.startIndex + pageData.rawData.length - 1;

			this.refreshBuffer(pageData);

			if (this.debugEnabled) {
				console.debug('[$DefaultInfinityDataSource] The page data have been applied. The current snapshot size is',
					this.getReadyDataSize(),
					', start index is', this._startIndex,
					', end index is', this._endIndex
				);
			}
		}
	}

	/**
	 * @override
	 */
	public getTotalLength(): number {
		return this._dataBuffer ? this._dataBuffer.length : 0;
	}

	/**
	 * @override
	 */
	public iterator(): ()=>Iterator<IDataSourceRow<T>> {
		return () => this.getIteratorInstance();
	}

	/**
	 * @override
	 */
	public isPageReady(startIndex: number, endIndex: number): boolean {
		if (!this._dataBuffer) {
			return false;
		}

		let isFilled: boolean = true;
		for (let index: number = startIndex; index <= endIndex; index++) {
			isFilled = isFilled && typeof this._dataBuffer[index] !== 'undefined';
		}
		return isFilled;
	}

	private refreshBuffer(pageData: InfinityPageData<T>) {
		this.makeBuffer(pageData);
		this.fillBuffer(pageData);
	}

	private fillBuffer(pageData: InfinityPageData<T>) {
		let currentIndex: number = pageData.startIndex;
		pageData.rawData.forEach((value: T) => this._dataBuffer[currentIndex++] = value);
	}

	private makeBuffer(pageData: InfinityPageData<T>) {
		const bufferSize: number = pageData.totalLength;

		if (!this._dataBuffer) {
			this._dataBuffer = new Array<T>(bufferSize);
		} else if (bufferSize !== this._dataBuffer.length) {
			const dataBufferLength: number = this._dataBuffer.length;

			if (bufferSize > dataBufferLength) {
				// Extend infinity buffer in runtime
				this._dataBuffer = this._dataBuffer.concat(new Array<T>(bufferSize - dataBufferLength));
			} else {
				this._dataBuffer = this._dataBuffer.slice(0, bufferSize);
			}
		}
	}

	private getReadyDataSize(): number {
		if (!this._dataBuffer) {
			return 0;
		}
		return this._dataBuffer.filter((value: T) => typeof value !== 'undefined').length;
	}

	private getIteratorInstance(): Iterator<IDataSourceRow<T>> {
		if (!this._dataBuffer) {
			return {
				next(): IteratorResult<IDataSourceRow<T>> {
					return {
						done: true,
						value: null
					}
				}
			};
		}

		return new DefaultIterator<T>(
			this._startIndex,
			this._endIndex,
			{
				getInstance: (index: number, firstIndex: number) =>
					new DataSourceRow(index, firstIndex, this._dataBuffer[index])
			}
		);
	}
}

interface IDataSourceRowFactory<T> {
	getInstance(index: number, firstIndex: number): IDataSourceRow<T>;
}

class DefaultIterator<T> implements Iterator<IDataSourceRow<T>> {

	private _initialStartPosition: number;

	constructor(private startPosition: number,
	            private endPosition: number,
	            private iteratorResultItemFactory: IDataSourceRowFactory<T>) {
		this._initialStartPosition = startPosition;
	}

	/**
	 * override
	 */
	public next(): IteratorResult<IDataSourceRow<T>> {
		const currentIndex: number = this.startPosition;
		let done: boolean = currentIndex > this.endPosition;

		if (!done) {
			this.startPosition++;
		}

		return {
			done: done,
			value: this.iteratorResultItemFactory.getInstance(currentIndex, this._initialStartPosition)
		}
	}
}

export interface IDataSourceRow<T> {
	getPosition(): number;
	getFirstPosition(): number;
	getValue(): T;
	hasValue(): boolean;
}

class DataSourceRow<T> implements IDataSourceRow<T> {

	constructor(private index: number, private firstIndex: number, private value: T) {
	}

	/**
	 * @override
	 */
	public getPosition(): number {
		return this.index;
	}

	/**
	 * @override
	 */
	public getFirstPosition(): number {
		return this.firstIndex;
	}

	/**
	 * @override
	 */
	public getValue(): T {
		return this.value;
	}

	/**
	 * @override
	 */
	public hasValue(): boolean {
		return typeof this.value !== 'undefined';
	}
}
