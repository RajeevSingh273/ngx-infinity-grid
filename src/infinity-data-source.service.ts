export interface InfinityData<T> {
	fullSize: number;
	data: T[];
}

export interface InfinityDataProvider<T> {
	fetch(startIndex: number, endIndex: number): Promise<InfinityData<T>>;
}

export interface InfinityDataSource<T> {
	getFullSize(): number;
	isFetched(startIndex: number, endIndex: number): boolean;
	fetch(startIndex: number, endIndex: number);
}

interface IDataSourceRowFactory<T> {
	getInstance(index: number, firstIndex: number): IDataSourceRow<T>;
}

export class DefaultInfinityDataSource<T> implements InfinityDataSource<T> {

	/**
	 * ES6 iterators compatibility
	 * @override
	 */
	[Symbol.iterator] = this.iterator();

	private _dataBuffer: T[];
	private _startIndex: number = 0;
	private _endIndex: number = 0;

	constructor(private _dataProvider: InfinityDataProvider<T>) {
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
		this._startIndex = startIndex;
		this._endIndex = endIndex;

		console.debug('[$DefaultInfinityDataSource] The data have been fetched. Start index is',
			startIndex, ', end index is', endIndex);

		if (this.isFetched(startIndex, endIndex)) {
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

		console.debug('[$DefaultInfinityDataSource] The data have been fetched. The current data size snapshot is',
			this.getFetchedDataSize());
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
				getInstance: (index: number, firstIndex: number) =>
					new DataSourceRow(index, firstIndex, this._dataBuffer[index])
			}
		);
	}
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
