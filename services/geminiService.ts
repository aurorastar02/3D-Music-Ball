
import { VisualizerConfig } from "../types";

export const generatePythonVisualizer = async (
  config: VisualizerConfig, 
  userPrompt?: string, 
  referenceImage?: string,
  signal?: AbortSignal
) => {
  await new Promise(resolve => setTimeout(resolve, 1500));

  const pythonTemplate = `
# 執行此腳本需要安裝: pip install pygame PyOpenGL numpy librosa
import pygame
from pygame.locals import *
from OpenGL.GL import *
from OpenGL.GLU import *
import numpy as np
import librosa
import os
import random

# --- 核心配置 ---
FILE_PATH = r'${config.audioFileName}'
BALL_COLOR = (
    ${parseInt(config.ballColor.slice(1, 3), 16) / 255},
    ${parseInt(config.ballColor.slice(3, 5), 16) / 255},
    ${parseInt(config.ballColor.slice(5, 7), 16) / 255}
)
SENSITIVITY = ${config.sensitivity}

def analyze_audio(path):
    print(f"正在執行『旗艦級自適應節拍分析系統』: {path} ...")
    if not os.path.exists(path):
        print(f"錯誤: 找不到音訊檔案 {path}")
        return None
    
    y, sr = librosa.load(path)
    S = np.abs(librosa.stft(y))
    low_freq_energy = np.mean(S[:20, :], axis=0) 
    mel_spec = librosa.feature.melspectrogram(y=y, sr=sr, n_mels=128, fmax=8000)
    onset_env = librosa.onset.onset_strength(S=librosa.power_to_db(mel_spec, ref=np.max), sr=sr)
    pulse = librosa.beat.plp(onset_envelope=onset_env, sr=sr)
    onsets = librosa.onset.onset_detect(onset_envelope=onset_env, sr=sr, backtrack=True)
    
    beat_frames = []
    pulse_threshold = np.median(pulse) * 1.2
    for o_frame in onsets:
        if pulse[o_frame] > pulse_threshold:
            beat_frames.append(o_frame)
            
    beat_times = librosa.frames_to_time(beat_frames, sr=sr)
    beat_intensities = []
    for f in beat_frames:
        start, end = max(0, f-2), min(len(low_freq_energy)-1, f+2)
        intensity = np.mean(low_freq_energy[start:end+1])
        beat_intensities.append(intensity)
    
    if len(beat_intensities) > 0:
        max_int = np.max(beat_intensities)
        min_int = np.min(beat_intensities)
        beat_intensities = 0.5 + (np.array(beat_intensities) - min_int) / (max_int - min_int + 1e-6) * 1.0
    
    return {"beats": list(zip(beat_times, beat_intensities)), "duration": librosa.get_duration(y=y, sr=sr)}

class Ripple:
    def __init__(self, pos, intensity=1.0, color=(0, 1, 1)):
        self.pos = list(pos)
        self.size = 1.2
        self.alpha = 1.0
        self.intensity = intensity
        self.speed = 0.18 + (intensity * 0.1)
        self.color = color

    def update(self):
        self.size += self.speed
        self.alpha -= 0.035
        return self.alpha > 0

    def draw(self):
        glPushMatrix()
        glTranslatef(self.pos[0], 0.05, self.pos[2])
        glRotatef(-90, 1, 0, 0)
        glColor4f(self.color[0], self.color[1], self.color[2], self.alpha * 0.3)
        quad = gluNewQuadric()
        gluDisk(quad, 0, self.size, 48, 1)
        glColor4f(self.color[0], self.color[1], self.color[2], self.alpha * 0.9)
        gluDisk(quad, self.size - 0.2, self.size, 48, 1)
        glPopMatrix()

class Target:
    def __init__(self, z_pos):
        self.pos = [random.uniform(-11, 11), 0, z_pos]
        self.opacity = 0.2
        self.flash = 0.0
        self.scan_offset = 0.0

    def draw(self):
        self.scan_offset = (self.scan_offset + 0.02) % 1.0
        glPushMatrix()
        glTranslatef(self.pos[0], 0.01, self.pos[2])
        glRotatef(-90, 1, 0, 0)
        
        f_alpha = min(1.0, self.opacity + self.flash)
        
        # 中心碟盤
        glColor4f(0, 0.8, 1, f_alpha * 0.4)
        quad = gluNewQuadric()
        gluDisk(quad, 0, 1.2, 32, 1)
        
        # 科技環與掃描效果
        glColor4f(0, 1, 1, f_alpha)
        gluDisk(quad, 1.15, 1.2, 32, 1)
        
        # 動態掃描環
        s_size = 1.2 * self.scan_offset
        glColor4f(0, 1, 1, (1.0 - self.scan_offset) * f_alpha * 0.8)
        gluDisk(quad, max(0, s_size - 0.05), s_size, 32, 1)
        
        # 繪製角落支架 (Tech Brackets)
        length = 0.4
        glBegin(GL_LINES)
        for angle in [45, 135, 225, 315]:
            rad = np.radians(angle)
            x, y = np.cos(rad) * 1.5, np.sin(rad) * 1.5
            # 畫支架 L 型
            glVertex2f(x, y)
            glVertex2f(x - np.cos(rad)*length, y)
            glVertex2f(x, y)
            glVertex2f(x, y - np.sin(rad)*length)
        glEnd()

        if self.flash > 0: self.flash *= 0.88
        glPopMatrix()

class HUD:
    def __init__(self, w, h):
        self.w, self.h = w, h
        # 科技感窄長面板
        self.panel_rect = pygame.Rect(w//2 - 400, h - 130, 800, 100)
        self.play_rect = pygame.Rect(self.panel_rect.x + 40, self.panel_rect.y + 25, 50, 50)
        self.progress_rect = pygame.Rect(self.panel_rect.x + 130, self.panel_rect.y + 45, 450, 10)
        self.vol_rect = pygame.Rect(self.panel_rect.x + 620, self.panel_rect.y + 45, 140, 10)

    def draw_tech_frame(self, rect, alpha):
        x, y, w, h = rect.x, rect.y, rect.w, rect.h
        glColor4f(0, 0.6, 1, 0.6 * alpha)
        glLineWidth(2)
        glBegin(GL_LINE_STRIP)
        glVertex2f(x, y + 20); glVertex2f(x, y); glVertex2f(x + 20, y)
        glEnd()
        glBegin(GL_LINE_STRIP)
        glVertex2f(x + w - 20, y); glVertex2f(x + w, y); glVertex2f(x + w, y + 20)
        glEnd()
        glBegin(GL_LINE_STRIP)
        glVertex2f(x + w, y + h - 20); glVertex2f(x + w, y + h); glVertex2f(x + w - 20, y + h)
        glEnd()
        glBegin(GL_LINE_STRIP)
        glVertex2f(x + 20, y + h); glVertex2f(x, y + h); glVertex2f(x, y + h - 20)
        glEnd()

    def draw_stylized_button(self, playing, alpha):
        x, y, w, h = self.play_rect.x, self.play_rect.y, self.play_rect.w, self.play_rect.h
        # 外圈發光
        glColor4f(0, 0.8, 1, 0.2 * alpha)
        glBegin(GL_QUADS)
        glVertex2f(x-2, y-2); glVertex2f(x+w+2, y-2); glVertex2f(x+w+2, y+h+2); glVertex2f(x-2, y+h+2)
        glEnd()
        
        if playing:
            glColor4f(0, 0.9, 1, alpha)
            glRectf(x+15, y+15, x+22, y+35); glRectf(x+28, y+15, x+35, y+35)
        else:
            glColor4f(0, 1, 0.6, alpha)
            glBegin(GL_TRIANGLES); glVertex2f(x+18, y+12); glVertex2f(x+18, y+38); glVertex2f(x+38, y+25); glEnd()

    def draw_segmented_bar(self, rect, fill_ratio, alpha, segments=20):
        x, y, w, h = rect.x, rect.y, rect.w, rect.h
        seg_w = w / segments
        for i in range(segments):
            is_filled = (i / segments) < fill_ratio
            color_alpha = alpha if is_filled else 0.15 * alpha
            glColor4f(0, 0.7, 1, color_alpha)
            glRectf(x + i*seg_w + 1, y, x + (i+1)*seg_w - 1, y + h)

    def draw(self, playing, volume, progress, alpha):
        if alpha <= 0.01: return
        glMatrixMode(GL_PROJECTION); glPushMatrix(); glLoadIdentity(); glOrtho(0, self.w, self.h, 0, -1, 1)
        glMatrixMode(GL_MODELVIEW); glPushMatrix(); glLoadIdentity(); glDisable(GL_DEPTH_TEST); glEnable(GL_BLEND)
        
        # 背景
        glColor4f(0, 0.02, 0.05, 0.8 * alpha)
        glRectf(self.panel_rect.x, self.panel_rect.y, self.panel_rect.x + self.panel_rect.w, self.panel_rect.y + self.panel_rect.h)
        
        self.draw_tech_frame(self.panel_rect, alpha)
        self.draw_stylized_button(playing, alpha)
        
        # 進度條
        self.draw_segmented_bar(self.progress_rect, progress, alpha, 40)
        # 音量條
        self.draw_segmented_bar(self.vol_rect, volume, alpha, 15)
        
        glEnable(GL_DEPTH_TEST); glPopMatrix(); glMatrixMode(GL_PROJECTION); glPopMatrix(); glMatrixMode(GL_MODELVIEW)

def main():
    pygame.init()
    display_info = pygame.display.Info()
    w, h = display_info.current_w, display_info.current_h
    pygame.display.set_mode((w, h), DOUBLEBUF | OPENGL | FULLSCREEN)
    pygame.display.set_caption("Flux 3D Visualizer - Cyber-Tech Edition")
    
    audio_data = analyze_audio(FILE_PATH)
    if not audio_data: return
    
    glEnable(GL_DEPTH_TEST); glEnable(GL_BLEND); glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA)
    hud = HUD(w, h)
    targets = [Target(-i * 12) for i in range(50)]
    ripples, trail = [], []
    ball_pos = [0, 0.5, 0]
    start_pos = [0, 0.5, 0]
    is_jumping = False; jump_progress = 0.0; jump_intensity = 1.0; landing_timer = 0.0
    playing = True; volume = ${config.volume}; hud_alpha = 0.0; current_target_idx = 0
    grid_scroll = 0.0
    
    pygame.mixer.music.load(FILE_PATH); pygame.mixer.music.set_volume(volume); pygame.mixer.music.play()
    clock = pygame.time.Clock()

    while True:
        mouse_pos = pygame.mouse.get_pos()
        target_hud_alpha = 1.0 if mouse_pos[1] > h - 150 else 0.0
        hud_alpha += (target_hud_alpha - hud_alpha) * 0.1
        curr_time = max(0, pygame.mixer.music.get_pos() / 1000.0)
        
        for event in pygame.event.get():
            if event.type == QUIT: pygame.quit(); return
            if event.type == KEYDOWN:
                if event.key == K_ESCAPE: pygame.quit(); return
                if event.key == K_SPACE:
                    playing = not playing
                    pygame.mixer.music.unpause() if playing else pygame.mixer.music.pause()
            if event.type == MOUSEBUTTONDOWN and hud_alpha > 0.5:
                mx, my = event.pos
                if hud.play_rect.collidepoint(mx, my):
                    playing = not playing
                    pygame.mixer.music.unpause() if playing else pygame.mixer.music.pause()
                elif hud.vol_rect.collidepoint(mx, my):
                    volume = (mx - hud.vol_rect.x) / hud.vol_rect.w
                    pygame.mixer.music.set_volume(volume)
                elif hud.progress_rect.collidepoint(mx, my):
                    target_time = ((mx - hud.progress_rect.x) / hud.progress_rect.w) * audio_data['duration']
                    pygame.mixer.music.play(start=max(0, target_time))

        if playing:
            grid_scroll = (grid_scroll + 0.1) % 10.0
            upcoming = [b for b in audio_data['beats'] if b[0] > curr_time]
            if upcoming and not is_jumping and landing_timer <= 0:
                if upcoming[0][0] - curr_time < 0.18:
                    is_jumping = True; jump_progress = 0.0; start_pos = list(ball_pos)
                    jump_intensity = upcoming[0][1]
                    current_target_idx = (current_target_idx + 1) % len(targets)
                    if current_target_idx > len(targets) - 10:
                        last_z = targets[-1].pos[2]
                        for i in range(1, 11): targets.append(Target(last_z - i * 12))

            if is_jumping:
                jump_progress += 0.045 * SENSITIVITY
                if jump_progress >= 1.0:
                    jump_progress = 1.0; is_jumping = False; landing_timer = 1.0
                    ripples.append(Ripple(ball_pos, intensity=jump_intensity))
                    targets[current_target_idx].flash = 1.6
                
                t = jump_progress; ease = t*t*(3-2*t)
                target = targets[current_target_idx]
                ball_pos[0] = start_pos[0] + (target.pos[0] - start_pos[0]) * ease
                ball_pos[2] = start_pos[2] + (target.pos[2] - start_pos[2]) * ease
                ball_pos[1] = 0.5 + np.sin(jump_progress * np.pi) * (6.0 + jump_intensity * 4.0)
            elif landing_timer > 0:
                landing_timer -= 0.08
                bounce = np.sin(landing_timer * np.pi * 3.0) * 0.7 * landing_timer * jump_intensity
                ball_pos[1] = 0.5 + max(0, bounce)
            else: 
                ball_pos[1] = 0.5
            
            sy = 1.0
            if is_jumping: sy = 1.0 + np.sin(jump_progress * np.pi) * 0.4 * jump_intensity
            elif landing_timer > 0.7: sy = 1.0 - (landing_timer - 0.7) * 2.5 * jump_intensity
            trail.append({'pos': list(ball_pos), 'sy': sy})
            if len(trail) > 120: trail.pop(0)

        glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT)
        glMatrixMode(GL_PROJECTION); glLoadIdentity(); gluPerspective(55, (w/h), 0.1, 500.0)
        glMatrixMode(GL_MODELVIEW); glLoadIdentity()
        gluLookAt(ball_pos[0] + 16, 16, ball_pos[2] + 24, ball_pos[0], 2, ball_pos[2] - 10, 0, 1, 0)
        
        # --- 雙層科技網格 (Cyber-Grid) ---
        glLineWidth(1)
        glColor3f(0.0, 0.15, 0.3)
        glBegin(GL_LINES)
        for i in range(-25, 26):
            # 橫向線 (靜止)
            glVertex3f(i*10, 0, ball_pos[2] + 250); glVertex3f(i*10, 0, ball_pos[2] - 150)
            # 縱向線 (動態滾動效果)
            z_offset = -grid_scroll
            for j in range(-15, 25):
                glVertex3f(-250, 0, ball_pos[2] + j*10 + z_offset)
                glVertex3f(250, 0, ball_pos[2] + j*10 + z_offset)
        glEnd()
        
        # 較細的掃描線 (發光層)
        glEnable(GL_BLEND); glBlendFunc(GL_SRC_ALPHA, GL_ONE)
        glColor4f(0, 0.6, 1.0, 0.2)
        glBegin(GL_LINES)
        for i in range(-5, 6):
            glVertex3f(i*50, 0.05, ball_pos[2] + 250); glVertex3f(i*50, 0.05, ball_pos[2] - 150)
        glEnd()
        glDisable(GL_BLEND); glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA)

        for t in targets: t.draw()
        ripples = [r for r in ripples if r.update()]; [r.draw() for r in ripples]
        
        # LED 尾跡
        glDepthMask(GL_FALSE); glBlendFunc(GL_SRC_ALPHA, GL_ONE)
        for i, item in enumerate(trail):
            pos, sy = item['pos'], item['sy']
            life_ratio = (i / len(trail))
            alpha_base = life_ratio ** 3 
            glPushMatrix()
            glTranslatef(pos[0], pos[1], pos[2])
            glScalef(1/np.sqrt(sy), sy, 1/np.sqrt(sy))
            glColor4f(BALL_COLOR[0], BALL_COLOR[1], BALL_COLOR[2], alpha_base * 0.5)
            gluSphere(gluNewQuadric(), 0.5, 12, 12)
            glPopMatrix()
        glDepthMask(GL_TRUE); glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA)
        
        # 主球體
        glPushMatrix(); glTranslatef(ball_pos[0], ball_pos[1], ball_pos[2]); glColor3f(*BALL_COLOR)
        sy = 1.0
        if is_jumping: sy = 1.0 + np.sin(jump_progress * np.pi) * 0.4 * jump_intensity
        elif landing_timer > 0.7: sy = 1.0 - (landing_timer - 0.7) * 2.5 * jump_intensity
        glScalef(1/np.sqrt(sy), sy, 1/np.sqrt(sy)); gluSphere(gluNewQuadric(), 0.5, 32, 32); glPopMatrix()

        hud.draw(playing, volume, max(0, curr_time / audio_data['duration']), hud_alpha)
        pygame.display.flip(); clock.tick(60)
    pygame.quit()

if __name__ == "__main__":
    main()
`;

  return {
    code: pythonTemplate.trim(),
    explanation: "科技美學全面改版：1. 引入雙層『賽博格點』地面，動態滾動的藍色線條大幅強化了空間的前進感。 2. 重新設計全息投影目標點 (Holographic Targets)，增加了邊角支架與自發光掃描環。 3. 現代化 HUD 控制面板：採用稜角分明的透明外框、分段式 LED 進度與音量條，以及高對比度的霓虹配色，完美契合未來科技視聽風格。"
  };
};
