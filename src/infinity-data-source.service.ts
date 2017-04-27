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

export class DefaultInfinityDataSource implements InfinityDataSource<string> {

	/**
	 * ES6 iterators compatibility
	 * @override
	 */
	[Symbol.iterator] = this.iterator();

	private _dataBuffer: string[];
	private _ready: boolean = false;
	private _startIndex: number = 0;
	private _endIndex: number = 0;

	constructor(private _dataProvider: InfinityDataProvider<string>) {
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
	public iterator(): ()=>Iterator<IDataSourceRow<string>> {
		return () => this.getIteratorInstance();
	}

	/**
	 * @override
	 */
	public fetch(startIndex: number, endIndex: number) {
		if (this.isFetched(startIndex, endIndex)) {
			this._startIndex = startIndex;
			this._endIndex = endIndex;

			console.debug('[$DefaultInfinityDataSource] The data have been fetched from cache. Start index is',
				startIndex, ', end index is', endIndex, ', the fetched data size is', this.getFetchedDataSize());
			return;
		}

		this._ready = false;

		this._dataProvider.fetch(startIndex, endIndex)
			.then((infinityData: InfinityData<string>) => {
				if (!this._dataBuffer) {
					this._dataBuffer = new Array<string>(infinityData.fullSize);
				}

				let currentIndex: number = startIndex;
				infinityData.data.forEach((value: string) => this._dataBuffer[currentIndex++] = value);

				this._startIndex = startIndex;
				this._endIndex = endIndex;
				this._ready = true;

				console.debug('[$DefaultInfinityDataSource] The data have been fetched. Start index is',
					startIndex, ', end index is', endIndex, ', the fetched data size is', this.getFetchedDataSize());
			});
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
		return this._dataBuffer.filter((value: string) => typeof value !== 'undefined').length;
	}

	private getIteratorInstance(): Iterator<IDataSourceRow<string>> {
		if (!this._dataBuffer) {
			return {
				next(): IteratorResult<IDataSourceRow<string>> {
					return {
						done: true,
						value: null
					}
				}
			};
		}

		return new DefaultIterator<string>(
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
