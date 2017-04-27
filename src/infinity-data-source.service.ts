export interface InfinityData<T> {
	fullSize: number;
	data: T[];
}

export interface InfinityDataProvider<T> {
	fetch(startIndex: number, endIndex: number): Promise<InfinityData<T>>;
}

export interface InfinityDataSource<T> {
	getFullSize(): number;
	isReady(): boolean;
	isFetched(startIndex: number, endIndex: number): boolean;
	fetch(startIndex: number, endIndex: number);
}

interface IDataSourceRowFactory<T> {
	getInstance(index: number): IDataSourceRow<T>;
}

export class DefaultInfinityDataSource<T> implements InfinityDataSource<T> {

	/**
	 * ES6 iterators compatibility
	 * @override
	 */
	[Symbol.iterator] = this.iterator();

	private _dataBuffer: T[];
	private _ready: boolean = false;
	private _startIndex: number = 0;
	private _endIndex: number = 0;
	private _fetchedStartIndex: number = 0;
	private _fetchedEndIndex: number = 0;

	constructor(private _dataProvider: InfinityDataProvider<T>) {
	}

	/**
	 * @override
	 */
	public isReady(): boolean {
		return this._ready;
	}

	/**
	 * @override
	 */
	public getFullSize(): number {
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
	public fetch(startIndex: number, endIndex: number) {
		this.updateStateBeforeFetch(startIndex, endIndex);

		if (this.isFetched(startIndex, endIndex)) {
			this.commitStateAfterFetch(startIndex, endIndex);
			return;
		}

		this._dataProvider.fetch(startIndex, endIndex)
			.then((infinityData: InfinityData<T>) => this.onFetch(startIndex, endIndex, infinityData));
	}

	private onFetch(startIndex: number, endIndex: number, infinityData: InfinityData<T>) {
		const infinityFullSize: number = infinityData.fullSize;

		if (!this._dataBuffer) {
			this._dataBuffer = new Array<T>(infinityFullSize);
		} else if (infinityFullSize !== this._dataBuffer.length) {
			const dataBufferLength: number = this._dataBuffer.length;

			if (infinityFullSize > dataBufferLength) {
				// Extend infinity buffer in runtime
				this._dataBuffer = this._dataBuffer.concat(new Array<T>(infinityFullSize - dataBufferLength));
			} else {
				this._dataBuffer = this._dataBuffer.slice(0, infinityFullSize);
			}
		}

		let currentIndex: number = startIndex;
		infinityData.data.forEach((value: T) => this._dataBuffer[currentIndex++] = value);

		if (this._fetchedStartIndex === startIndex && this._fetchedEndIndex === endIndex) {
			// The promise is not cancellable
			// https://github.com/tc39/proposal-cancelable-promises
			// We should check the current and previous indexes

			this.commitStateAfterFetch(startIndex, endIndex);
		}
	}

	private updateStateBeforeFetch(startIndex: number, endIndex: number) {
		this._ready = false;
		this._fetchedStartIndex = startIndex;
		this._fetchedEndIndex = endIndex;
	}

	private commitStateAfterFetch(startIndex: number, endIndex: number) {
		this._startIndex = startIndex;
		this._endIndex = endIndex;
		this._ready = true;

		console.debug('[$DefaultInfinityDataSource] The data have been fetched. Start index is',
			startIndex, ', end index is', endIndex, ', the fetched data size is', this.getFetchedDataSize());
	}

	/**
	 * @override
	 */
	public isFetched(startIndex: number, endIndex: number): boolean {
		if (!this._dataBuffer) {
			return false;
		}

		let isFilled: boolean = true;
		for (let index: number = startIndex; index <= endIndex; index++) {
			isFilled = isFilled && typeof this._dataBuffer[index] !== 'undefined';
		}
		return isFilled;
	}

	private getFetchedDataSize(): number {
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
				getInstance: (index: number) => new DataSourceRow(index, this._dataBuffer[index])
			}
		);
	}
}

class DefaultIterator<T> implements Iterator<IDataSourceRow<T>> {

	constructor(private startPosition: number,
	            private endPosition: number,
	            private iteratorResultItemFactory: IDataSourceRowFactory<T>) {
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
			value: this.iteratorResultItemFactory.getInstance(currentIndex)
		}
	}
}

export interface IDataSourceRow<T> {
	getPosition(): number;
	getValue(): T;
}

class DataSourceRow<T> implements IDataSourceRow<T> {

	constructor(private index: number, private value: T) {
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
	public getValue(): T {
		return this.value;
	}
}
