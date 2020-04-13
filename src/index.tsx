// file for testing template-api locally

// @ts-ignore
import template from 'template-api';
import * as React from 'react';
import * as ReactDOM from 'react-dom';

class Index extends React.Component<object> {
  render() {
    return <div>Loader...</div>;
  }
}

ReactDOM.render(<Index />, document.querySelector('#root'));
