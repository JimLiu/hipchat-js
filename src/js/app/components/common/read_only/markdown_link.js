const link_re = /(.*)\[(.*?)\]\((.*?)\)(.*)/;

export default React.createClass({

  render() {
    const text = this.props.children || '';

    if (!text.match(link_re)){
      return <span>{ text }</span>;
    }

    let pre, post, link;
    text.replace(link_re, (match, p1, p2, p3, p4) => {
      pre = p1;
      link = <a href={ p3 } target="_blank">{ p2 }</a>;
      post = p4;
    });

    return (
      <span>{ pre }{ link }{ post }</span>
    );
  }

});



/** WEBPACK FOOTER **
 ** ./src/js/app/components/common/read_only/markdown_link.js
 **/