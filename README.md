# ng2-infinity-grid

An implementation of infinity grid at Angular2 [4.x compatible].

## Demo

[This is a demo](https://apoterenko.github.io/ng2-infinity-grid)

## Description

The solution based on virtual scroll technique and use most large possible height value of html element.

## Installation

First you need to install the npm module:
```sh
npm install ng2-infinity-grid --save
```

## Usage

```html
<button type="button" (click)="loadData()">Load</button>&nbsp;
<button type="button" (click)="clearData()">Clear</button>
...
<InfinityGrid [pageData]="pageData"
              [preventLoadPageAfterViewInit]="true"
              (fetchPage)="onFetchPage($event)">
</InfinityGrid>
```

```typescript
import {
	InfinityPage,
	InfinityPageData,
} from "ng2-infinity-grid/index";

@Component({...})
export class HomeComponent {

	private dataProvider: DataProvider;
	private pageData: InfinityPageData<string>;

	constructor() {
		this.dataProvider = new DataProvider();  // Inject your data provider here
	}

	private clearData() {
		// Case #1 - initial state
		// Flux action should be started here. Local pageData object should be updated during Flux-lifecycle
		this.pageData = null;
	}

	private loadData() {
		// Case #2
		// Flux action should be started here. Local pageData object should be updated during Flux-lifecycle
		this.pageData = {};
	}

	private onFetchPage(page: InfinityPage) {
		// Case #3
		// Flux action should be started here. Local pageData object should be updated during Flux-lifecycle
		// When long asynchronous request has been started so we should show loading rows in grid
		this.pageData = {
			startIndex: page.startIndex,
			endIndex: page.endIndex
		};

		if (!page.isReady) {
			this.dataProvider.fetch(page)
				.then((pageData: InfinityPageData<string>) => {
					if (pageData.startIndex === this.pageData.startIndex) {

						// Case #4
						// The promise is not cancellable [https://github.com/tc39/proposal-cancelable-promises]
						// We should check the current index
						this.pageData = pageData;
					}
				});
		}
	}
}

class DataProvider {

	private buffer: string[] = [];

	constructor() {
		for (let i = 0; i < 1000000; i++) {
			this.buffer[i] = 'test-' + i;
		}
	}

	public fetch(page: InfinityPage): Promise<InfinityPageData<string>> {
		return new Promise<InfinityPageData<string>>((resolve) => {
			setTimeout(() => {
				resolve({
					startIndex: page.startIndex,
					rawData: this.buffer.slice(page.startIndex, page.endIndex + 1),
					totalLength: this.buffer.length
				});
			}, 1000);
		});
	}
}
```

## Publish

```sh
npm run deploy
```

## License

Licensed under MIT.