import { Component, createRef } from "react";
import { createPortal } from "react-dom";
import { IconRemove } from "@humansignal/icons";
import { aroundTransition } from "@humansignal/core/lib/utils/transition";
import { Button } from "../Button/Button";
import "./Modal.scss";

export class Modal extends Component {
  modalRef = createRef();

  constructor(props) {
    super(props);

    this.state = {
      title: props.title,
      body: props.body,
      footer: props.footer,
      visible: props.animateAppearance ? false : (props.visible ?? false),
      transition: props.visible ? "visible" : null,
    };
  }

  componentDidMount() {
    if (this.props.animateAppearance) {
      setTimeout(() => this.show(), 30);
    }
  }

  setBody(body) {
    this.setState({ body });
  }

  show(onShow) {
    return new Promise((resolve) => {
      this.setState({ visible: true }, async () => {
        onShow?.();
        this.props.onShow?.();
        await this.transition("appear", resolve);
      });
    });
  }

  async hide(onHidden) {
    return new Promise((resolve) => {
      this.transition("disappear", () => {
        this.setState({ visible: false }, () => {
          this.props.onHide?.();
          resolve();
          onHidden?.();
        });
      });
    });
  }

  render() {
    if (!this.state.visible) return null;

    const bare = this.props.bare;

    const modalClasses = ["dm-modal"];
    if (this.props.fullscreen) modalClasses.push("dm-modal_fullscreen");
    if (this.props.bare) modalClasses.push("dm-modal_bare");
    if (this.props.visible || this.state.visible) modalClasses.push("dm-modal_visible");
    if (this.transitionClass) modalClasses.push(this.transitionClass);
    if (this.props.className) modalClasses.push(this.props.className);

    const modalContent = (
      <div className={modalClasses.join(" ")} ref={this.modalRef} onClick={this.onClickOutside}>
        <div className="dm-modal__wrapper">
          <div className="dm-modal__content" style={this.props.style}>
            {!bare && (
              <Modal.Header>
                <div className="dm-modal__title">{this.state.title}</div>
                {this.props.allowClose !== false && (
                  <Button className="dm-modal__close" type="text" style={{ color: "0099FF" }} icon={<IconRemove />} />
                )}
              </Modal.Header>
            )}
            <div className={`dm-modal__body ${bare ? "dm-modal__body_bare" : ""}`}>{this.body}</div>
            {this.state.footer && <Modal.Footer>{this.state.footer}</Modal.Footer>}
          </div>
        </div>
      </div>
    );

    return createPortal(modalContent, document.body);
  }

  onClickOutside = (e) => {
    const { closeOnClickOutside } = this.props;
    const isInModal = this.modalRef.current.contains(e.target);
    const content = e.target.closest(".dm-modal__content");
    const close = e.target.closest(".dm-modal__close");

    if ((isInModal && close) || (content === null && closeOnClickOutside !== false)) {
      this.hide();
    }
  };

  transition(type, onFinish) {
    return aroundTransition(this.modalRef.current, {
      transition: async () =>
        new Promise((resolve) => {
          this.setState({ transition: type }, () => {
            resolve();
          });
        }),
      beforeTransition: async () =>
        new Promise((resolve) => {
          this.setState({ transition: `before-${type}` }, () => {
            resolve();
          });
        }),
      afterTransition: async () =>
        new Promise((resolve) => {
          this.setState({ transition: type === "appear" ? "visible" : null }, () => {
            onFinish?.();
            resolve();
          });
        }),
    });
  }

  get transitionClass() {
    switch (this.state.transition) {
      case "before-appear":
        return "before-appear";
      case "appear":
        return "appear before-appear";
      case "before-disappear":
        return "before-disappear";
      case "disappear":
        return "disappear before-disappear";
      case "visible":
        return "visible";
    }
    return null;
  }

  get body() {
    if (this.state.body) {
      const Content = this.state.body;

      return Content instanceof Function ? <Content /> : Content;
    }
    return this.props.children;
  }
}

Modal.Header = ({ children, divided }) => (
  <div className={`dm-modal__header ${divided ? "dm-modal__header_divided" : ""}`}>{children}</div>
);

Modal.Footer = ({ children }) => <div className="dm-modal__footer">{children}</div>;
