import {Text} from '@codemirror/state';
import {markdownLanguage} from '@codemirror/lang-markdown';
import {headingsFromTree} from './outline-core.js';
self.onmessage=event=>{const source=event.data.source,doc=Text.of(source.split('\n')),tree=markdownLanguage.parser.parse(source);self.postMessage({items:headingsFromTree(doc,tree)});};
