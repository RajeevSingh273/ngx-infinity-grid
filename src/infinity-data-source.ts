export interface InfinityDataSource<T> {
	getLength(): number;
	isReady(): boolean;
	applyRange(start: number, end: number);
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

	private records: string[] = [];

	constructor(private ready: boolean = true,
	            private start: number = 0,
	            private end: number = 0) {

		for (let i = 0; i < 100000; i++) {
			this.records[i] = 'test-' + i;
		}

		setTimeout(() => {
			this.records[2] = 'updated-test-';
		}, 2000);
	}

	/**
	 * @override
	 */
	public isReady(): boolean {
		return this.ready;
	}

	/**
	 * @override
	 */
	public getLength(): number {
		return this.records.length;
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
	public applyRange(start: number, end: number) {
		this.ready = false;

		setTimeout(() => {
			this.start = start;
			this.end = end;

			this.ready = true;
		}, 500)
	}

	private getIteratorInstance(): Iterator<IDataSourceRow<string>> {
		return new DefaultIterator<string>(this.start, this.end, {
			getInstance: (index: number) => new DataSourceRow(index, this.records[index])
		});
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
