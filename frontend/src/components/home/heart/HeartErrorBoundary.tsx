"use client";

import { Component, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  /** Called once if the scene throws, for example when a shader fails. */
  onError: () => void;
};

/** Keeps a failure in the 3D scene from taking the home page down. */
export class HeartErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onError();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
