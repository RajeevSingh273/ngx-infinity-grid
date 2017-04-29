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
<InfinityGrid [pageData]="pageData"
              (fetchPage)="onFetchPage($event)">
</InfinityGrid>
```

```typescript
import {Component} from '@angular/core';

import {
    InfinityPage,
    InfinityPageData,
} from "ng2-infinity-grid/index";

class DataProvider {

  private buffer:string[] = [];

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

@Component({
  moduleId: module.id,
  selector: 'sd-home',
  templateUrl: 'home.component.html'
})
export class HomeComponent {

  private dataProvider: DataProvider;
  private pageData: InfinityPageData<string>;

  constructor() {
    this.dataProvider = new DataProvider();  // Inject your data provider here
  }

  private onFetchPage(page: InfinityPage) {

    // Flux action should be started here
    // Local pageData object should be updated during Flux-lifecycle
    // When long asynchronous request has been started, we should show loading rows in grid
    this.pageData = {
      startIndex: page.startIndex,
      endIndex: page.endIndex
    };

    if (!page.isReady) {
      this.dataProvider.fetch(page)
          .then((pageData: InfinityPageData<string>) => {
            if (pageData.startIndex === this.pageData.startIndex) {
              // The promise is not cancellable
              // https://github.com/tc39/proposal-cancelable-promises
              // We should check the current and previous indexes

              this.pageData = pageData;
            }
          });
    }
  }
}
```

## Publish

```sh
npm run deploy
```

## License

Licensed under MIT.